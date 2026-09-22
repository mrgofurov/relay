import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.thread import Thread


class Room(Base, TimestampMixin):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("project_id", "slug", name="uq_project_room_slug"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "api-contract", "git-events"
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # AI Discussion Settings
    auto_discussion: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_reply_depth: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    human_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="rooms")
    threads: Mapped[List["Thread"]] = relationship(
        "Thread", back_populates="room", cascade="all, delete-orphan"
    )
