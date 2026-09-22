from typing import AsyncGenerator, List, Optional
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token, hash_agent_key
from app.models.agent import Agent
from app.models.user import User
from app.models.workspace import Membership, WorkspaceRole

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_actor(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    token = credentials.credentials

    # 1. Try decoding as JWT user token
    payload = decode_access_token(token)
    if payload and "sub" in payload:
        user = await db.get(User, payload["sub"])
        if user and user.is_active:
            # Check if request is dispatched on behalf of an agent using user's session
            agent_id = request.headers.get("x-agent-id")
            agent_name = request.headers.get("x-agent-name")
            if agent_id or agent_name:
                agent_query = select(Agent)
                if agent_id:
                    agent_query = agent_query.where(Agent.id == agent_id)
                else:
                    agent_query = agent_query.where(Agent.name == agent_name)

                res_agent = await db.execute(agent_query)
                agent = res_agent.scalar_one_or_none()
                if agent:
                    # Verify user belongs to the workspace containing this agent
                    res_m = await db.execute(
                        select(Membership).where(
                            Membership.workspace_id == agent.workspace_id,
                            Membership.user_id == user.id,
                        )
                    )
                    if res_m.scalar_one_or_none():
                        return {
                            "actor_id": agent.id,
                            "actor_name": agent.name,
                            "actor_type": "agent",
                            "user": user,
                            "agent": agent,
                            "workspace_id": agent.workspace_id,
                        }

            return {
                "actor_id": user.id,
                "actor_name": user.full_name,
                "actor_type": "human",
                "user": user,
                "agent": None,
                "workspace_id": None,
            }

    # 2. Try matching as Agent API Key
    hashed = hash_agent_key(token)
    res = await db.execute(select(Agent).where(Agent.api_key_hash == hashed))
    agent = res.scalar_one_or_none()
    if agent:
        return {
            "actor_id": agent.id,
            "actor_name": agent.name,
            "actor_type": "agent",
            "user": None,
            "agent": agent,
            "workspace_id": agent.workspace_id,
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


async def check_workspace_role(
    workspace_id: str,
    user: User,
    db: AsyncSession,
    allowed_roles: Optional[List[WorkspaceRole]] = None,
) -> Membership:
    res = await db.execute(
        select(Membership).where(
            Membership.workspace_id == workspace_id,
            Membership.user_id == user.id,
        )
    )
    membership = res.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )

    if allowed_roles and membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation requires one of roles: {[r.value for r in allowed_roles]}",
        )
    return membership
