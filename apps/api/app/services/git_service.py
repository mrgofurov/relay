import hashlib
import hmac
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageType
from app.models.project import Project
from app.models.room import Room
from app.models.thread import Thread, ThreadStatus
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager


def verify_github_signature(secret: str, payload_body: bytes, signature_header: Optional[str]) -> bool:
    if not secret:
        return True
    if not signature_header:
        return False
    hash_type, signature = signature_header.split("=")
    mac = hmac.new(secret.encode(), msg=payload_body, digestmod=hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), signature)


async def get_or_create_git_room(db: AsyncSession, workspace_id: str) -> Room:
    # Try finding an existing room with slug "git-events" in this workspace
    res = await db.execute(
        select(Room).where(
            Room.workspace_id == workspace_id,
            Room.slug == "git-events",
        )
    )
    room = res.scalar_one_or_none()
    if room:
        return room

    # If no room exists, find a project in the workspace or create a default project
    proj_res = await db.execute(
        select(Project).where(Project.workspace_id == workspace_id).limit(1)
    )
    proj = proj_res.scalar_one_or_none()
    if not proj:
        proj = Project(
            workspace_id=workspace_id,
            name="General",
            key="GEN",
            description="Default workspace project",
        )
        db.add(proj)
        await db.flush()

    room = Room(
        workspace_id=workspace_id,
        project_id=proj.id,
        name="Git Events",
        slug="git-events",
        description="Automated GitHub commit, pull request, and branch notifications",
        auto_discussion=False,
    )
    db.add(room)
    await db.flush()
    return room


async def process_github_event(
    db: AsyncSession,
    workspace_id: str,
    event_name: str,
    payload: Dict[str, Any],
) -> Tuple[Optional[Thread], Optional[Message]]:
    room = await get_or_create_git_room(db, workspace_id)
    repo = payload.get("repository", {})
    repo_name = repo.get("name", "Repository")

    sender = payload.get("sender", {}).get("login", "GitHub")
    title = ""
    content = ""
    meta = {}

    if event_name == "push":
        ref = payload.get("ref", "")
        branch = ref.replace("refs/heads/", "") if "refs/heads/" in ref else ref
        commits = payload.get("commits", [])
        commit_count = len(commits)

        title = f"Git Push: {repo_name} ({branch})"
        commit_lines = []
        total_added = 0
        total_removed = 0
        total_modified = 0

        for c in commits[:5]:
            msg = c.get("message", "").split("\n")[0]
            sha = c.get("id", "")[:7]
            commit_lines.append(f"- [`{sha}`] {msg}")
            total_added += len(c.get("added", []))
            total_removed += len(c.get("removed", []))
            total_modified += len(c.get("modified", []))

        files_changed = total_added + total_removed + total_modified
        summary_line = f"**{sender}** pushed **{commit_count} commit(s)** to `{branch}`"
        stats_line = f"📊 `{files_changed} files changed` (+{total_added} added, -{total_removed} removed, ~{total_modified} modified)"

        content = f"{summary_line}\n\n{stats_line}\n\n" + "\n".join(commit_lines)
        if commit_count > 5:
            content += f"\n*...and {commit_count - 5} more commits*"

        meta = {
            "type": "push",
            "repo": repo_name,
            "branch": branch,
            "commits": commit_count,
            "files_changed": files_changed,
        }

    elif event_name == "pull_request":
        action = payload.get("action", "opened")
        pr = payload.get("pull_request", {})
        pr_title = pr.get("title", "Pull Request")
        pr_num = pr.get("number", "")
        pr_url = pr.get("html_url", "")
        base = pr.get("base", {}).get("ref", "main")
        head = pr.get("head", {}).get("ref", "")

        title = f"PR #{pr_num}: {pr_title}"
        content = (
            f"**{sender}** {action} pull request [#{pr_num} {pr_title}]({pr_url})\n\n"
            f"Merging `{head}` into `{base}`\n\n"
            f"> {pr.get('body', '')[:300]}"
        )
        meta = {
            "type": "pull_request",
            "action": action,
            "number": pr_num,
            "url": pr_url,
            "head": head,
            "base": base,
        }

    else:
        title = f"Git Event: {event_name.title()} in {repo_name}"
        content = f"Event `{event_name}` received from **{sender}** on repository `{repo_name}`."
        meta = {"type": event_name}

    # Create thread in git-events room
    thread = Thread(
        room_id=room.id,
        workspace_id=workspace_id,
        title=title,
        author_id="github-system",
        author_name=sender,
        author_type="git",
        status=ThreadStatus.OPEN,
        message_count=1,
    )
    db.add(thread)
    await db.flush()

    # Create first message in thread
    message = Message(
        thread_id=thread.id,
        room_id=room.id,
        workspace_id=workspace_id,
        author_id="github-system",
        author_name="Git",
        author_type=MessageType.GIT,
        content=content,
        mentions=[],
        metadata_payload=meta,
        reply_depth=0,
    )
    db.add(message)
    await db.flush()

    # Broadcast git.push / message.created event
    await manager.broadcast_to_room(
        room.id,
        WebSocketEvents.GIT_PUSH,
        {
            "thread_id": thread.id,
            "room_id": room.id,
            "title": title,
            "content": content,
            "metadata": meta,
        },
    )

    return thread, message
