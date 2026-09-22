import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.room import Room


class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("workspace_id", "key", name="uq_workspace_project_key"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., "BACKEND", "MOBILE"
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="projects")
    rooms: Mapped[List["Room"]] = relationship(
        "Room", back_populates="project", cascade="all, delete-orphan"
    )
