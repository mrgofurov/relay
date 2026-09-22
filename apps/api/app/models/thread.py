import enum
import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.room import Room
    from app.models.message import Message


class ThreadStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    ARCHIVED = "archived"


class Thread(Base, TimestampMixin):
    __tablename__ = "threads"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    author_type: Mapped[str] = mapped_column(String(20), default="human", nullable=False)
    status: Mapped[ThreadStatus] = mapped_column(
        Enum(ThreadStatus), default=ThreadStatus.OPEN, nullable=False
    )
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="threads")
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="thread", cascade="all, delete-orphan", order_by="Message.created_at"
    )
