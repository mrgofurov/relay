"""Agent Device Authorization Flow.

This module implements the secure one-time connection code flow:

  1. Browser: POST /agent-connections          → creates code, returns display_code
  2. CLI:     POST /agent-connections/exchange  → validates code, issues agent_token
  3. Browser: GET  /agent-connections/{id}/status → polls for agent connection

Provider credentials (Claude key, Gemini key, etc.) are NEVER sent here.
Relay only issues its own agent credential after the developer authenticates
via their existing Relay user session.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.core.security import (
    generate_agent_key,
    generate_agent_token,
    generate_connection_code,
    hash_agent_key,
    hash_agent_token,
    hash_connection_code,
)
from app.models.agent import Agent, AgentStatus
from app.models.agent_connection import AgentConnectionCode
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.agent import AgentCreate, AgentResponse
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

router = APIRouter(tags=["Agent Connections"])

CODE_EXPIRY_MINUTES = 10


# ─── Request/Response schemas ────────────────────────────────────────────────


class CreateConnectionRequest(BaseModel):
    """Browser requests a connection code for an agent."""
    agent_name: str = Field(min_length=1, max_length=100)
    provider: str = Field(default="custom", max_length=50)
    model: str = Field(default="unknown", max_length=100)


class CreateConnectionResponse(BaseModel):
    """Returned to the browser. display_code is shown to the developer."""
    connection_id: str
    agent_id: str
    display_code: str          # e.g. "RLY-7K4P-X9Q2"
    cli_command: str           # "relay agent connect RLY-7K4P-X9Q2"
    expires_at: datetime
    expires_in_seconds: int


class ExchangeCodeRequest(BaseModel):
    """CLI sends the plaintext code to exchange for a long-lived agent token."""
    code: str = Field(min_length=10, max_length=20)
    # Optional: override agent name/model reported by the local agent
    agent_name: Optional[str] = None
    model: Optional[str] = None


class ExchangeCodeResponse(BaseModel):
    """Returned to the CLI. agent_token is shown ONCE — developer must save it."""
    agent_token: str          # "rly_agent_xxxxx"  — save to ~/.relay/credentials.json
    agent_id: str
    agent_name: str
    workspace_id: str
    workspace_name: str


class ConnectionStatusResponse(BaseModel):
    connection_id: str
    agent_id: str
    agent_name: str
    status: str               # "pending" | "connected" | "expired"
    connected_at: Optional[datetime]


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/agent-connections", response_model=CreateConnectionResponse)
async def create_connection_code(
    req: CreateConnectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Browser: Generate a one-time connection code for a local agent.

    - Creates or reuses an Agent record
    - Generates a cryptographically random code (RLY-XXXX-XXXX)
    - Stores only its hash — plaintext is returned once and never stored
    - Code expires in 10 minutes
    - Code is single-use
    """
    # Get user's default workspace (first owned/admin workspace)
    from app.models.workspace import Membership, WorkspaceRole as WR
    res = await db.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.role.in_([WR.OWNER, WR.ADMIN]),
        ).limit(1)
    )
    membership = res.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a workspace owner or admin to connect an agent",
        )
    workspace_id = membership.workspace_id

    # Fetch or create the agent
    existing = await db.execute(
        select(Agent).where(
            Agent.workspace_id == workspace_id,
            Agent.name == req.agent_name,
        )
    )
    agent = existing.scalar_one_or_none()

    if not agent:
        from app.models.agent import AgentProvider, AgentTransport
        try:
            provider_enum = AgentProvider(req.provider.lower())
        except ValueError:
            provider_enum = AgentProvider.CUSTOM

        # Generate placeholder api_key_hash (required by schema, not used in device flow)
        placeholder_key = generate_agent_key()
        agent = Agent(
            workspace_id=workspace_id,
            name=req.agent_name,
            provider=provider_enum,
            model=req.model,
            avatar="",
            transport=AgentTransport.LOCAL_CLI,
            status=AgentStatus.OFFLINE,
            api_key_hash=hash_agent_key(placeholder_key),
        )
        db.add(agent)
        await db.flush()  # get agent.id

    # Generate one-time connection code
    plaintext_code = generate_connection_code()
    code_hash = hash_connection_code(plaintext_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRY_MINUTES)

    conn_code = AgentConnectionCode(
        code_hash=code_hash,
        workspace_id=workspace_id,
        agent_id=agent.id,
        created_by_user_id=current_user.id,
        expires_at=expires_at,
    )
    db.add(conn_code)
    await db.commit()
    await db.refresh(conn_code)
    await db.refresh(agent)

    return CreateConnectionResponse(
        connection_id=conn_code.id,
        agent_id=agent.id,
        display_code=plaintext_code,
        cli_command=f"relay agent connect {plaintext_code}",
        expires_at=expires_at,
        expires_in_seconds=CODE_EXPIRY_MINUTES * 60,
    )


@router.post("/agent-connections/exchange", response_model=ExchangeCodeResponse)
async def exchange_connection_code(
    req: ExchangeCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """CLI: Exchange a one-time code for a long-lived agent token.

    - No user authentication required (the code IS the credential)
    - Code must not be expired and must not have been used before
    - Code is invalidated immediately (single-use)
    - A new agent_token is issued and its hash stored on the agent
    - The plaintext token is returned ONCE — developer saves to ~/.relay/credentials.json
    """
    code_hash = hash_connection_code(req.code)

    res = await db.execute(
        select(AgentConnectionCode).where(AgentConnectionCode.code_hash == code_hash)
    )
    conn_code = res.scalar_one_or_none()

    if not conn_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid connection code",
        )
    if conn_code.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection code has already been used",
        )
    if conn_code.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection code has expired",
        )

    # Invalidate code immediately (single-use guarantee)
    conn_code.used_at = datetime.now(timezone.utc)

    # Load the agent
    agent = await db.get(Agent, conn_code.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update agent metadata if provided by CLI
    if req.agent_name:
        agent.name = req.agent_name
    if req.model:
        agent.model = req.model

    # Issue new agent token (invalidates any previous token)
    plaintext_token = generate_agent_token()
    agent.agent_token_hash = hash_agent_token(plaintext_token)

    await db.commit()
    await db.refresh(agent)

    # Fetch workspace name for CLI display
    from app.models.workspace import Workspace
    workspace = await db.get(Workspace, agent.workspace_id)

    # Notify browser via WebSocket that the agent connected via device flow
    await manager.broadcast_to_workspace(
        agent.workspace_id,
        "agent.device_connected",
        {
            "connection_id": conn_code.id,
            "agent_id": agent.id,
            "agent_name": agent.name,
        },
    )

    return ExchangeCodeResponse(
        agent_token=plaintext_token,
        agent_id=agent.id,
        agent_name=agent.name,
        workspace_id=agent.workspace_id,
        workspace_name=workspace.name if workspace else "Unknown",
    )


@router.get("/agent-connections/{connection_id}/status", response_model=ConnectionStatusResponse)
async def get_connection_status(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Browser: Poll connection status to know when the agent has connected."""
    conn_code = await db.get(AgentConnectionCode, connection_id)
    if not conn_code:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify the requester belongs to the workspace
    from app.models.workspace import Membership
    res = await db.execute(
        select(Membership).where(
            Membership.workspace_id == conn_code.workspace_id,
            Membership.user_id == current_user.id,
        )
    )
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    agent = await db.get(Agent, conn_code.agent_id)

    if conn_code.is_used:
        status_str = "connected"
    elif conn_code.is_expired:
        status_str = "expired"
    else:
        status_str = "pending"

    return ConnectionStatusResponse(
        connection_id=conn_code.id,
        agent_id=conn_code.agent_id,
        agent_name=agent.name if agent else "Unknown",
        status=status_str,
        connected_at=conn_code.used_at,
    )


@router.delete("/agent-connections/{agent_id}/revoke", status_code=204)
async def revoke_agent_token(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an agent's device-flow token. The agent's WebSocket will be disconnected."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await check_workspace_role(
        agent.workspace_id, current_user, db,
        allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    )

    # Wipe token hash — any subsequent WS auth with this token will fail
    agent.agent_token_hash = None
    agent.status = AgentStatus.OFFLINE
    await db.commit()

    # Notify workspace — agent forced offline
    await manager.broadcast_to_workspace(
        agent.workspace_id,
        WebSocketEvents.AGENT_OFFLINE,
        {"agent_id": agent.id, "name": agent.name, "reason": "token_revoked"},
    )
