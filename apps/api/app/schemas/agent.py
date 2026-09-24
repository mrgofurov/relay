from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(default="gemini", max_length=50)
    room_id: Optional[str] = None
    device_id: Optional[str] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    room_id: Optional[str] = None
    status: Optional[str] = None


class AgentResponse(BaseModel):
    id: str
    workspace_id: str
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    name: str
    type: str = "gemini"
    provider: Optional[str] = None
    model: str = "native-cli"
    status: str = "offline"
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentHeartbeat(BaseModel):
    status: str = "online"
