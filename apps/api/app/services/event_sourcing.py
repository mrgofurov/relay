from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event


async def record_event(
    db: AsyncSession,
    workspace_id: str,
    event_type: str,
    actor_type: str,
    actor_name: str,
    payload: Dict[str, Any],
    room_id: Optional[str] = None,
    thread_id: Optional[str] = None,
) -> Event:
    event = Event(
        workspace_id=workspace_id,
        room_id=room_id,
        thread_id=thread_id,
        actor_type=actor_type,
        actor_name=actor_name,
        event_type=event_type,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event
