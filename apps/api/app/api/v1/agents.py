from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_actor, get_current_user
from app.core.database import get_db
from app.core.security import generate_agent_key, hash_agent_key
from app.models.agent import Agent, AgentStatus
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.agent import (
    AgentCreate,
    AgentHeartbeat,
    AgentRegisteredResponse,
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


@router.post("/workspaces/{workspace_id}/agents", response_model=AgentRegisteredResponse)
async def register_agent(
    workspace_id: str,
    req: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(
        workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    # Generate unique secure agent key
    plaintext_key = generate_agent_key()
    key_hash = hash_agent_key(plaintext_key)

    agent = Agent(
        workspace_id=workspace_id,
        name=req.name,
        provider=req.provider,
        model=req.model,
        avatar=req.avatar or "",
        transport=req.transport,
        status=AgentStatus.OFFLINE,
        api_key_hash=key_hash,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    return AgentRegisteredResponse(
        agent=AgentResponse.model_validate(agent),
        api_key=plaintext_key,
    )


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
    if req.provider is not None:
        agent.provider = req.provider
    if req.model is not None:
        agent.model = req.model
    if req.avatar is not None:
        agent.avatar = req.avatar
    if req.transport is not None:
        agent.transport = req.transport
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
            if agent.status == AgentStatus.ONLINE
            else WebSocketEvents.AGENT_OFFLINE
        )
        await manager.broadcast_to_workspace(
            agent.workspace_id, ev, {"agent_id": agent.id, "name": agent.name}
        )

    return agent
