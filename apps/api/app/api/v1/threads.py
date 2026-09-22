from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_actor, get_current_user
from app.core.database import get_db
from app.models.message import Message, MessageType
from app.models.room import Room
from app.models.thread import Thread, ThreadStatus
from app.models.user import User
from app.schemas.thread import ThreadCreate, ThreadResponse, ThreadUpdate
from app.services.event_sourcing import record_event
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

router = APIRouter(tags=["Threads"])


@router.get("/rooms/{room_id}/threads", response_model=List[ThreadResponse])
async def list_room_threads(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await check_workspace_role(room.workspace_id, current_user, db)

    res = await db.execute(
        select(Thread)
        .where(Thread.room_id == room_id)
        .order_by(Thread.updated_at.desc())
    )
    return res.scalars().all()


@router.post("/rooms/{room_id}/threads", response_model=ThreadResponse)
async def create_thread(
    room_id: str,
    req: ThreadCreate,
    actor: dict = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if actor["actor_type"] == "human":
        await check_workspace_role(room.workspace_id, actor["user"], db)
    elif actor["workspace_id"] != room.workspace_id:
        raise HTTPException(status_code=403, detail="Agent does not belong to this workspace")

    thread = Thread(
        room_id=room_id,
        workspace_id=room.workspace_id,
        title=req.title,
        author_id=actor["actor_id"],
        author_name=actor["actor_name"],
        author_type=actor["actor_type"],
        status=ThreadStatus.OPEN,
        message_count=1 if req.initial_message else 0,
    )
    db.add(thread)
    await db.flush()

    if req.initial_message:
        msg = Message(
            thread_id=thread.id,
            room_id=room_id,
            workspace_id=room.workspace_id,
            author_id=actor["actor_id"],
            author_name=actor["actor_name"],
            author_type=MessageType.AGENT if actor["actor_type"] == "agent" else MessageType.HUMAN,
            content=req.initial_message,
            mentions=[],
            metadata_payload={},
            reply_depth=0,
        )
        db.add(msg)
        await db.flush()

    # Event sourcing
    await record_event(
        db=db,
        workspace_id=room.workspace_id,
        room_id=room.id,
        thread_id=thread.id,
        actor_type=actor["actor_type"],
        actor_name=actor["actor_name"],
        event_type=WebSocketEvents.THREAD_CREATED,
        payload={"thread_id": thread.id, "title": thread.title, "room_id": room.id},
    )

    await db.commit()
    await db.refresh(thread)

    # Realtime notification
    await manager.broadcast_to_room(
        room_id,
        WebSocketEvents.THREAD_CREATED,
        {
            "id": thread.id,
            "room_id": thread.room_id,
            "workspace_id": thread.workspace_id,
            "title": thread.title,
            "author_id": thread.author_id,
            "author_name": thread.author_name,
            "author_type": thread.author_type,
            "status": thread.status.value,
            "message_count": thread.message_count,
            "created_at": thread.created_at.isoformat(),
        },
    )

    return thread


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    await check_workspace_role(thread.workspace_id, current_user, db)
    return thread


@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: str,
    req: ThreadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    await check_workspace_role(thread.workspace_id, current_user, db)

    if req.title is not None:
        thread.title = req.title
    if req.status is not None:
        thread.status = req.status

    await db.commit()
    await db.refresh(thread)

    await manager.broadcast_to_room(
        thread.room_id,
        WebSocketEvents.THREAD_UPDATED,
        {
            "id": thread.id,
            "title": thread.title,
            "status": thread.status.value,
        },
    )

    return thread


@router.post("/threads/{thread_id}/resolve", response_model=ThreadResponse)
async def resolve_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    await check_workspace_role(thread.workspace_id, current_user, db)

    thread.status = ThreadStatus.RESOLVED
    await db.commit()
    await db.refresh(thread)

    await manager.broadcast_to_room(
        thread.room_id,
        WebSocketEvents.THREAD_UPDATED,
        {"id": thread.id, "status": "resolved"},
    )
    return thread
