import json
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.workspace import Workspace
from app.services.event_sourcing import record_event
from app.services.git_service import process_github_event, verify_github_signature

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github/{workspace_id}")
async def handle_github_webhook(
    workspace_id: str,
    request: Request,
    x_github_event: str = Header("push", alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db),
):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    body = await request.body()
    # Verify signature if configured
    if settings.GITHUB_WEBHOOK_SECRET:
        if not verify_github_signature(settings.GITHUB_WEBHOOK_SECRET, body, x_hub_signature_256):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GitHub webhook signature",
            )

    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    thread, message = await process_github_event(
        db=db,
        workspace_id=workspace_id,
        event_name=x_github_event,
        payload=payload,
    )

    if thread and message:
        await record_event(
            db=db,
            workspace_id=workspace_id,
            room_id=thread.room_id,
            thread_id=thread.id,
            actor_type="git",
            actor_name="GitHub Webhook",
            event_type=f"git.{x_github_event}",
            payload={"action": x_github_event, "title": thread.title},
        )
        await db.commit()

        return {
            "status": "success",
            "thread_id": thread.id,
            "message_id": message.id,
            "event": x_github_event,
        }

    return {"status": "ignored"}
