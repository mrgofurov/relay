from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class GitHubAuthor(BaseModel):
    name: Optional[str] = "unknown"
    email: Optional[str] = ""
    username: Optional[str] = ""


class GitHubCommit(BaseModel):
    id: str
    message: str
    timestamp: Optional[str] = None
    url: Optional[str] = None
    author: Optional[GitHubAuthor] = None
    added: Optional[List[str]] = []
    removed: Optional[List[str]] = []
    modified: Optional[List[str]] = []


class GitHubRepository(BaseModel):
    id: Optional[int] = None
    name: str
    full_name: str
    html_url: Optional[str] = None
    default_branch: Optional[str] = "main"


class GitHubWebhookPayload(BaseModel):
    ref: Optional[str] = None  # e.g., "refs/heads/main"
    before: Optional[str] = None
    after: Optional[str] = None
    repository: Optional[GitHubRepository] = None
    commits: Optional[List[GitHubCommit]] = []
    head_commit: Optional[GitHubCommit] = None
    action: Optional[str] = None
    pull_request: Optional[Dict[str, Any]] = None
    sender: Optional[Dict[str, Any]] = None
