from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.agent import AgentProvider, AgentStatus, AgentTransport


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    provider: AgentProvider = AgentProvider.CUSTOM
    model: str = Field(default="default", max_length=100)
    avatar: Optional[str] = ""
    transport: AgentTransport = AgentTransport.WEBSOCKET


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[AgentProvider] = None
    model: Optional[str] = None
    avatar: Optional[str] = None
    transport: Optional[AgentTransport] = None
    status: Optional[AgentStatus] = None


class AgentResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    provider: AgentProvider
    model: str
    avatar: str
    transport: AgentTransport
    status: AgentStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentRegisteredResponse(BaseModel):
    agent: AgentResponse
    api_key: str  # Plaintext key shown ONLY once at registration


class AgentHeartbeat(BaseModel):
    status: AgentStatus = AgentStatus.ONLINE
