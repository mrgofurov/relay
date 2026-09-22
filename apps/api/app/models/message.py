import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.thread import Thread


class MessageType(str, enum.Enum):
    HUMAN = "human"
    AGENT = "agent"
    SYSTEM = "system"
    GIT = "git"
    TASK = "task"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    author_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType), default=MessageType.HUMAN, nullable=False
    )
    provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., claude, gemini, openai
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)    # e.g., gpt-4o, claude-3-5-sonnet
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mentions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)  # ["@gemini", "@claude"]
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    reply_depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    edited_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")
