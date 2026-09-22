from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.workspace import WorkspaceRole


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    description: Optional[str] = ""


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = ""
    owner_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MembershipCreate(BaseModel):
    user_id: str
    role: WorkspaceRole = WorkspaceRole.MEMBER


class MembershipUpdate(BaseModel):
    role: WorkspaceRole


class MembershipResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    role: WorkspaceRole
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
