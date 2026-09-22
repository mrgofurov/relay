from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.thread import ThreadStatus


class ThreadCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    initial_message: Optional[str] = None


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[ThreadStatus] = None


class ThreadResponse(BaseModel):
    id: str
    room_id: str
    workspace_id: str
    title: str
    author_id: str
    author_name: str
    author_type: str
    status: ThreadStatus
    message_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
