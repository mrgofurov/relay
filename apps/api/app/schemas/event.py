from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class EventResponse(BaseModel):
    id: str
    workspace_id: str
    room_id: Optional[str] = None
    thread_id: Optional[str] = None
    actor_type: str
    actor_name: str
    event_type: str
    payload: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
