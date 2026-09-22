from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: str
    type: str  # "message", "thread", "room", "agent"
    title: str
    snippet: str
    workspace_id: str
    room_id: Optional[str] = None
    thread_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: str


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]
