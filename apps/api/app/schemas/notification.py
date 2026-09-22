from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    type: str
    title: str
    content: str
    resource_id: Optional[str] = None
    data: Dict[str, Any]
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[list[str]] = None
    mark_all: bool = False
