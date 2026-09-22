from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    key: str = Field(min_length=1, max_length=20, pattern="^[A-Z0-9_-]+$")
    description: Optional[str] = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    key: str
    description: Optional[str] = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
