import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class Agent(Base, TimestampMixin):
    """AI Agent representation in Relay.

    Relay only stores metadata (id, user_id, device_id, room_id, name, type, status).
    Relay NEVER creates or stores API keys, OAuth tokens, or permanent agent secrets.
    """
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True
    )
    room_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "gemini", "Murtazo Gemini"
    type: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)  # "gemini", "claude", "cursor", "codex", etc.
    status: Mapped[str] = mapped_column(String(20), default="offline", nullable=False)  # "online", "offline", "busy"
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="agents")

    @property
    def provider(self) -> str:
        return self.type

    @property
    def model(self) -> str:
        return "native-cli"
