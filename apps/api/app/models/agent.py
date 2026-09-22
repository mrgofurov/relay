import enum
import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class AgentProvider(str, enum.Enum):
    CLAUDE = "claude"
    GEMINI = "gemini"
    OPENAI = "openai"
    CURSOR = "cursor"
    CUSTOM = "custom"


class AgentTransport(str, enum.Enum):
    LOCAL_CLI = "cli"
    HTTP_API = "http"
    WEBSOCKET = "websocket"


class AgentStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"


class Agent(Base, TimestampMixin):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "claude-code", "gemini-cli"
    provider: Mapped[AgentProvider] = mapped_column(
        Enum(AgentProvider), default=AgentProvider.CUSTOM, nullable=False
    )
    model: Mapped[str] = mapped_column(String(100), default="default", nullable=False)
    avatar: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    transport: Mapped[AgentTransport] = mapped_column(
        Enum(AgentTransport), default=AgentTransport.WEBSOCKET, nullable=False
    )
    status: Mapped[AgentStatus] = mapped_column(
        Enum(AgentStatus), default=AgentStatus.OFFLINE, nullable=False
    )
    api_key_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="agents")
