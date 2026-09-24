"""Device Pairing Flow.

Relay never creates or stores API keys, OAuth tokens, or permanent agent secrets.
Authentication belongs to the AI CLI (Gemini CLI / agy, Claude Code, Codex).

Relay only:
  1. Authenticates the human user into Relay (relay login)
  2. Generates a temporary 60-second pairing code (AB7K-92QP)
  3. Pairs the developer's device (relay agent attach AB7K-92QP)
  4. Launches local agent (relay agent run <type>)
  5. Routes messages between rooms
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.core.security import generate_pairing_code
from app.models.agent import Agent
from app.models.device_pairing import DevicePairing
from app.models.room import Room
from app.models.user import User
from app.models.workspace import Membership, WorkspaceRole
from app.websocket.manager import manager

router = APIRouter(tags=["Device Pairings"])

PAIRING_TTL_SECONDS = 60


class CreatePairingRequest(BaseModel):
    agent_name: str = Field(min_length=1, max_length=100)
    agent_type: str = Field(default="gemini", max_length=50)
    room_id: str = Field(min_length=1)


class CreatePairingResponse(BaseModel):
    code: str
    room_id: str
    room_name: str
    agent_name: str
    agent_type: str
    expires_at: datetime
    expires_in_seconds: int
    instructions: List[str]


class AttachDeviceRequest(BaseModel):
    code: str = Field(min_length=6, max_length=20)
    device_id: Optional[str] = None
    device_name: Optional[str] = None


class AttachDeviceResponse(BaseModel):
    ok: bool = True
    device_id: str
    agent_id: str
    agent_name: str
    agent_type: str
    room_id: str
    room_name: str
    workspace_id: str


class PairingStatusResponse(BaseModel):
    code: str
    status: str  # "pending" | "connected" | "expired"
    agent_id: Optional[str] = None
    agent_name: str
    room_id: str
    connected_at: Optional[datetime] = None


@router.post("/device-pairings", response_model=CreatePairingResponse)
async def create_device_pairing(
    req: CreatePairingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Web UI: Generate a temporary 60-second pairing code.

    Format: 8-character human-readable code (e.g. AB7K-92QP).
    Expires in 60 seconds. One-time use. NOT a secret.
    """
    room = await db.get(Room, req.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await check_workspace_role(room.workspace_id, current_user, db)

    code = generate_pairing_code()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=PAIRING_TTL_SECONDS)

    pairing = DevicePairing(
        code=code,
        user_id=current_user.id,
        room_id=room.id,
        agent_name=req.agent_name.strip(),
        agent_type=req.agent_type.strip().lower(),
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
    )
    db.add(pairing)
    await db.commit()
    await db.refresh(pairing)

    return CreatePairingResponse(
        code=code,
        room_id=room.id,
        room_name=room.name,
        agent_name=pairing.agent_name,
        agent_type=pairing.agent_type,
        expires_at=expires_at,
        expires_in_seconds=PAIRING_TTL_SECONDS,
        instructions=[
            "relay login",
            f"relay agent attach {code}",
            f"relay agent run {pairing.agent_type}",
        ],
    )


@router.post("/device-pairings/attach", response_model=AttachDeviceResponse)
async def attach_device(
    req: AttachDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """CLI: Attach local device to user account and room via pairing code.

    Process:
      1. Verify user session exists (enforced by get_current_user)
      2. Send pairing code
      3. Server validates expiration (TTL 60s)
      4. Device becomes attached to user's account & room
      5. Pairing code is consumed immediately
    """
    clean_code = req.code.strip().upper()
    pairing = await db.get(DevicePairing, clean_code)

    if not pairing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pairing code",
        )
    if pairing.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pairing code has already been used",
        )
    if pairing.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pairing code has expired (60s limit). Please generate a fresh code.",
        )

    room = await db.get(Room, pairing.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Target room no longer exists")

    device_id = req.device_id or f"dev_{uuid.uuid4().hex[:12]}"

    # Check if agent already exists with same name in this room
    existing_agent_res = await db.execute(
        select(Agent).where(
            Agent.workspace_id == room.workspace_id,
            Agent.name == pairing.agent_name,
        )
    )
    agent = existing_agent_res.scalar_one_or_none()

    if agent:
        agent.user_id = current_user.id
        agent.device_id = device_id
        agent.room_id = room.id
        agent.type = pairing.agent_type
        agent.status = "offline"
        agent.last_seen = datetime.now(timezone.utc)
    else:
        agent = Agent(
            workspace_id=room.workspace_id,
            room_id=room.id,
            user_id=current_user.id,
            device_id=device_id,
            name=pairing.agent_name,
            type=pairing.agent_type,
            status="offline",
            last_seen=datetime.now(timezone.utc),
        )
        db.add(agent)

    # Ensure attaching user has membership in the workspace
    user_mem = await db.execute(
        select(Membership).where(
            Membership.workspace_id == room.workspace_id,
            Membership.user_id == current_user.id,
        )
    )
    if not user_mem.scalar_one_or_none():
        new_mem = Membership(
            workspace_id=room.workspace_id,
            user_id=current_user.id,
            role=WorkspaceRole.MEMBER,
        )
        db.add(new_mem)

    # Invalidate pairing code immediately
    pairing.used_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(agent)

    # Notify Web UI via WebSocket
    await manager.broadcast_to_room(
        room.id,
        "device.paired",
        {
            "code": clean_code,
            "agent_id": agent.id,
            "agent_name": agent.name,
            "agent_type": agent.type,
            "room_id": room.id,
            "room_name": room.name,
        },
    )

    await manager.broadcast_to_workspace(
        room.workspace_id,
        "agent.created",
        {
            "agent_id": agent.id,
            "name": agent.name,
            "type": agent.type,
            "room_id": room.id,
        },
    )

    return AttachDeviceResponse(
        ok=True,
        device_id=device_id,
        agent_id=agent.id,
        agent_name=agent.name,
        agent_type=agent.type,
        room_id=room.id,
        room_name=room.name,
        workspace_id=room.workspace_id,
    )


@router.get("/device-pairings/{code}/status", response_model=PairingStatusResponse)
async def get_pairing_status(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Web UI: Poll pairing code status (pending / connected / expired)."""
    clean_code = code.strip().upper()
    pairing = await db.get(DevicePairing, clean_code)
    if not pairing:
        raise HTTPException(status_code=404, detail="Pairing code not found")

    room = await db.get(Room, pairing.room_id)
    if room:
        await check_workspace_role(room.workspace_id, current_user, db)

    if pairing.is_used:
        status_str = "connected"
    elif pairing.is_expired:
        status_str = "expired"
    else:
        status_str = "pending"

    # Find associated agent if paired
    agent_id = None
    if pairing.is_used:
        res = await db.execute(
            select(Agent).where(
                Agent.room_id == pairing.room_id,
                Agent.name == pairing.agent_name,
            )
        )
        ag = res.scalar_one_or_none()
        if ag:
            agent_id = ag.id

    return PairingStatusResponse(
        code=clean_code,
        status=status_str,
        agent_id=agent_id,
        agent_name=pairing.agent_name,
        room_id=pairing.room_id,
        connected_at=pairing.used_at,
    )
