from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.models.agent import Agent
from app.models.message import Message
from app.models.room import Room
from app.models.thread import Thread
from app.models.user import User
from app.schemas.search import SearchResponse, SearchResultItem

router = APIRouter(tags=["Search"])


@router.get("/workspaces/{workspace_id}/search", response_model=SearchResponse)
async def search_workspace(
    workspace_id: str,
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(workspace_id, current_user, db)
    pattern = f"%{q}%"
    results: List[SearchResultItem] = []

    # 1. Search Messages
    msg_res = await db.execute(
        select(Message)
        .where(
            Message.workspace_id == workspace_id,
            or_(
                Message.content.ilike(pattern),
                Message.author_name.ilike(pattern),
            ),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    for msg in msg_res.scalars().all():
        results.append(
            SearchResultItem(
                id=msg.id,
                type="message",
                title=f"Message by {msg.author_name}",
                snippet=msg.content[:150],
                workspace_id=msg.workspace_id,
                room_id=msg.room_id,
                thread_id=msg.thread_id,
                author_name=msg.author_name,
                created_at=msg.created_at.isoformat(),
            )
        )

    # 2. Search Threads
    thread_res = await db.execute(
        select(Thread)
        .where(
            Thread.workspace_id == workspace_id,
            Thread.title.ilike(pattern),
        )
        .order_by(Thread.updated_at.desc())
        .limit(limit)
    )
    for th in thread_res.scalars().all():
        results.append(
            SearchResultItem(
                id=th.id,
                type="thread",
                title=th.title,
                snippet=f"Thread with {th.message_count} messages, status: {th.status.value}",
                workspace_id=th.workspace_id,
                room_id=th.room_id,
                thread_id=th.id,
                author_name=th.author_name,
                created_at=th.created_at.isoformat(),
            )
        )

    # 3. Search Rooms
    room_res = await db.execute(
        select(Room)
        .where(
            Room.workspace_id == workspace_id,
            or_(
                Room.name.ilike(pattern),
                Room.slug.ilike(pattern),
                Room.description.ilike(pattern),
            ),
        )
        .limit(10)
    )
    for rm in room_res.scalars().all():
        results.append(
            SearchResultItem(
                id=rm.id,
                type="room",
                title=f"#{rm.name}",
                snippet=rm.description or f"Room in workspace",
                workspace_id=rm.workspace_id,
                room_id=rm.id,
                created_at=rm.created_at.isoformat(),
            )
        )

    # 4. Search Agents
    agent_res = await db.execute(
        select(Agent)
        .where(
            Agent.workspace_id == workspace_id,
            or_(
                Agent.name.ilike(pattern),
                Agent.model.ilike(pattern),
            ),
        )
        .limit(10)
    )
    for ag in agent_res.scalars().all():
        results.append(
            SearchResultItem(
                id=ag.id,
                type="agent",
                title=f"@{ag.name} ({ag.provider.value})",
                snippet=f"Agent model: {ag.model}, status: {ag.status.value}",
                workspace_id=ag.workspace_id,
                created_at=ag.created_at.isoformat(),
            )
        )

    return SearchResponse(query=q, total=len(results), results=results)
