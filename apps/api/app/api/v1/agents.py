from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_actor, get_current_user
from app.core.database import get_db
from app.models.agent import Agent
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.agent import (
    AgentCreate,
    AgentHeartbeat,
    AgentResponse,
    AgentUpdate,
)
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

router = APIRouter(tags=["Agents"])


@router.get("/workspaces/{workspace_id}/agents", response_model=List[AgentResponse])
async def list_workspace_agents(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(workspace_id, current_user, db)
    res = await db.execute(
        select(Agent).where(Agent.workspace_id == workspace_id).order_by(Agent.name)
    )
    return res.scalars().all()


@router.post("/workspaces/{workspace_id}/agents", response_model=AgentResponse)
async def register_agent(
    workspace_id: str,
    req: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register agent metadata in a workspace.

    Relay never stores API keys or secrets.
    """
    await check_workspace_role(
        workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    agent = Agent(
        workspace_id=workspace_id,
        user_id=current_user.id,
        device_id=req.device_id,
        room_id=req.room_id,
        name=req.name,
        type=req.type,
        status="offline",
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    return agent


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await check_workspace_role(agent.workspace_id, current_user, db)
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    req: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await check_workspace_role(
        agent.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    if req.name is not None:
        agent.name = req.name
    if req.type is not None:
        agent.type = req.type
    if req.room_id is not None:
        agent.room_id = req.room_id
    if req.status is not None:
        agent.status = req.status

    await db.commit()
    await db.refresh(agent)
    return agent


@router.post("/agents/{agent_id}/heartbeat", response_model=AgentResponse)
async def agent_heartbeat(
    agent_id: str,
    req: AgentHeartbeat,
    actor: dict = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if actor["actor_id"] != agent_id and actor.get("user") is None:
        raise HTTPException(status_code=403, detail="Unauthorized agent access")

    old_status = agent.status
    agent.status = req.status
    await db.commit()
    await db.refresh(agent)

    if old_status != agent.status:
        ev = (
            WebSocketEvents.AGENT_ONLINE
            if agent.status == "online"
            else WebSocketEvents.AGENT_OFFLINE
        )
        await manager.broadcast_to_workspace(
            agent.workspace_id, ev, {"agent_id": agent.id, "name": agent.name}
        )

    return agent


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an AI agent from the workspace."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await check_workspace_role(
        agent.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    workspace_id = agent.workspace_id
    agent_name = agent.name

    await db.delete(agent)
    await db.commit()

    # Broadcast to workspace that agent was deleted
    await manager.broadcast_to_workspace(
        workspace_id,
        WebSocketEvents.AGENT_OFFLINE,
        {"agent_id": agent_id, "name": agent_name, "deleted": True},
    )

    return {"ok": True, "agent_id": agent_id, "deleted": True}
