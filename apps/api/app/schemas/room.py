from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    description: Optional[str] = ""
    is_private: bool = False
    auto_discussion: bool = True
    max_reply_depth: int = Field(default=3, ge=1, le=20)
    human_approval: bool = False


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None
    auto_discussion: Optional[bool] = None
    max_reply_depth: Optional[int] = Field(None, ge=1, le=20)
    human_approval: Optional[bool] = None


class RoomSettingsUpdate(BaseModel):
    auto_discussion: bool
    max_reply_depth: int = Field(ge=1, le=20)
    human_approval: bool


class RoomResponse(BaseModel):
    id: str
    project_id: str
    workspace_id: str
    name: str
    slug: str
    description: Optional[str] = ""
    is_private: bool
    auto_discussion: bool
    max_reply_depth: int
    human_approval: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
