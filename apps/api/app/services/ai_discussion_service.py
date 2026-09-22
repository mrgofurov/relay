from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageType
from app.models.room import Room


class DiscussionGuardResult:
    def __init__(
        self,
        allowed: bool,
        current_depth: int,
        max_depth: int,
        reason: Optional[str] = None,
        needs_human_approval: bool = False,
    ):
        self.allowed = allowed
        self.current_depth = current_depth
        self.max_depth = max_depth
        self.reason = reason
        self.needs_human_approval = needs_human_approval


async def evaluate_discussion_guard(
    db: AsyncSession,
    room: Room,
    thread_id: str,
    author_type: MessageType,
) -> DiscussionGuardResult:
    # If author is human or system, reset chain depth to 0
    if author_type != MessageType.AGENT:
        return DiscussionGuardResult(
            allowed=True,
            current_depth=0,
            max_depth=room.max_reply_depth,
            needs_human_approval=False,
        )

    # If author is agent, check last messages in thread to determine consecutive agent depth
    res = await db.execute(
        select(Message)
        .where(Message.thread_id == thread_id)
        .order_by(Message.created_at.desc())
        .limit(room.max_reply_depth + 2)
    )
    recent_messages = res.scalars().all()

    current_depth = 0
    for msg in recent_messages:
        if msg.author_type == MessageType.AGENT:
            current_depth += 1
        else:
            break

    next_depth = current_depth + 1

    # Check if auto discussion is disabled in this room
    if not room.auto_discussion and current_depth > 0:
        return DiscussionGuardResult(
            allowed=False,
            current_depth=next_depth,
            max_depth=room.max_reply_depth,
            reason="Auto discussion is disabled in this room. Human prompt required.",
        )

    # Check max reply depth
    if next_depth > room.max_reply_depth:
        return DiscussionGuardResult(
            allowed=False,
            current_depth=next_depth,
            max_depth=room.max_reply_depth,
            reason=f"Max AI discussion depth of {room.max_reply_depth} reached. Halting auto-discussion.",
        )

    # Check if human approval is enforced
    if room.human_approval and current_depth > 0:
        return DiscussionGuardResult(
            allowed=True,
            current_depth=next_depth,
            max_depth=room.max_reply_depth,
            needs_human_approval=True,
            reason="Human approval required before further automated replies.",
        )

    return DiscussionGuardResult(
        allowed=True,
        current_depth=next_depth,
        max_depth=room.max_reply_depth,
        needs_human_approval=False,
    )
