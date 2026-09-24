from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_actor, get_current_user
from app.core.database import get_db
from app.models.message import Message, MessageType
from app.models.room import Room
from app.models.thread import Thread
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse, MessageUpdate
from app.services.ai_discussion_service import evaluate_discussion_guard
from app.services.event_sourcing import record_event
from app.services.mention_service import extract_mentions, process_mentions
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

router = APIRouter(tags=["Messages"])


@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
async def list_thread_messages(
    thread_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    await check_workspace_role(thread.workspace_id, current_user, db)

    res = await db.execute(
        select(Message)
        .where(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return res.scalars().all()


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
async def create_thread_message(
    thread_id: str,
    req: MessageCreate,
    actor: dict = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    room = await db.get(Room, thread.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    author_type = MessageType.AGENT if actor["actor_type"] == "agent" else req.message_type
    if actor["actor_type"] == "human":
        await check_workspace_role(thread.workspace_id, actor["user"], db)
    elif actor["workspace_id"] != thread.workspace_id:
        raise HTTPException(status_code=403, detail="Agent does not belong to this workspace")

    # AI Discussion Guard check
    guard = await evaluate_discussion_guard(db, room, thread_id, author_type)
    if not guard.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=guard.reason or "Discussion guard limit reached",
        )

    # Detect mentions in content
    auto_mentions = extract_mentions(req.content)
    all_mentions = list(set((req.mentions or []) + auto_mentions))

    provider = req.provider
    model = req.model
    if actor["actor_type"] == "agent" and actor["agent"]:
        agent_obj = actor["agent"]
        provider = getattr(agent_obj, "type", None) or getattr(agent_obj, "provider", "gemini")
        if hasattr(provider, "value"):
            provider = provider.value
        model = getattr(agent_obj, "model", "native-cli")

    message = Message(
        thread_id=thread_id,
        room_id=thread.room_id,
        workspace_id=thread.workspace_id,
        author_id=actor["actor_id"],
        author_name=actor["actor_name"],
        author_type=author_type,
        provider=provider,
        model=model,
        content=req.content,
        mentions=all_mentions,
        metadata_payload=req.metadata_payload or {},
        reply_depth=guard.current_depth,
    )
    db.add(message)

    # Increment thread message count and touch timestamp
    thread.message_count += 1
    thread.updated_at = datetime.now(timezone.utc)

    # Event Sourcing
    await record_event(
        db=db,
        workspace_id=thread.workspace_id,
        room_id=thread.room_id,
        thread_id=thread.id,
        actor_type=author_type.value,
        actor_name=actor["actor_name"],
        event_type=WebSocketEvents.MESSAGE_CREATED,
        payload={
            "message_id": message.id,
            "thread_id": thread.id,
            "content": message.content,
            "mentions": all_mentions,
            "reply_depth": message.reply_depth,
        },
    )

    await db.flush()

    # Process mentions (create notifications + notify target agents over WS)
    await process_mentions(
        db=db,
        workspace_id=thread.workspace_id,
        room_id=thread.room_id,
        thread_id=thread.id,
        message_id=message.id,
        author_id=actor["actor_id"],
        author_name=actor["actor_name"],
        content=message.content,
        mentions=all_mentions,
    )

    await db.commit()
    await db.refresh(message)

    # Broadcast message created to room and thread
    msg_payload = {
        "id": message.id,
        "thread_id": message.thread_id,
        "room_id": message.room_id,
        "workspace_id": message.workspace_id,
        "author_id": message.author_id,
        "author_name": message.author_name,
        "author_type": message.author_type.value,
        "provider": message.provider,
        "model": message.model,
        "content": message.content,
        "mentions": message.mentions,
        "metadata_payload": message.metadata_payload,
        "reply_depth": message.reply_depth,
        "created_at": message.created_at.isoformat(),
    }

    await manager.broadcast_to_thread(thread.id, WebSocketEvents.MESSAGE_CREATED, msg_payload)
    await manager.broadcast_to_room(room.id, WebSocketEvents.MESSAGE_CREATED, msg_payload)

    return message


@router.patch("/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: str,
    req: MessageUpdate,
    actor: dict = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.author_id != actor["actor_id"]:
        raise HTTPException(status_code=403, detail="Can only edit your own message")

    message.content = req.content
    message.edited_at = datetime.now(timezone.utc)
    message.mentions = extract_mentions(req.content)

    await db.commit()
    await db.refresh(message)

    edit_payload = {
        "id": message.id,
        "thread_id": message.thread_id,
        "content": message.content,
        "edited_at": message.edited_at.isoformat(),
    }
    await manager.broadcast_to_thread(message.thread_id, WebSocketEvents.MESSAGE_UPDATED, edit_payload)
    return message
