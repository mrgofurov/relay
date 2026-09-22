from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.message import MessageType


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)
    message_type: MessageType = MessageType.HUMAN
    provider: Optional[str] = None
    model: Optional[str] = None
    metadata_payload: Optional[Dict[str, Any]] = None
    mentions: Optional[List[str]] = None


class MessageUpdate(BaseModel):
    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    room_id: str
    workspace_id: str
    author_id: str
    author_name: str
    author_type: MessageType
    provider: Optional[str] = None
    model: Optional[str] = None
    content: str
    mentions: List[str] = []
    metadata_payload: Dict[str, Any] = {}
    reply_depth: int = 0
    created_at: datetime
    edited_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
