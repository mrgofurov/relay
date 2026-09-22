from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Membership, Workspace, WorkspaceRole
from app.schemas.workspace import (
    MembershipCreate,
    MembershipResponse,
    MembershipUpdate,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_user_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Workspace)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .where(Membership.user_id == current_user.id)
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    req: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if slug exists
    res = await db.execute(select(Workspace).where(Workspace.slug == req.slug))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace slug already taken",
        )

    workspace = Workspace(
        name=req.name,
        slug=req.slug,
        description=req.description,
        owner_id=current_user.id,
    )
    db.add(workspace)
    await db.flush()

    # Add owner membership
    membership = Membership(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=WorkspaceRole.OWNER,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(workspace_id, current_user, db)
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    req: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(
        workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.name is not None:
        ws.name = req.name
    if req.description is not None:
        ws.description = req.description

    await db.commit()
    await db.refresh(ws)
    return ws


@router.get("/{workspace_id}/members", response_model=List[MembershipResponse])
async def list_workspace_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(workspace_id, current_user, db)
    query = (
        select(Membership)
        .options(selectinload(Membership.user))
        .where(Membership.workspace_id == workspace_id)
    )
    res = await db.execute(query)
    memberships = res.scalars().all()
    out = []
    for m in memberships:
        out.append(
            MembershipResponse(
                id=m.id,
                user_id=m.user_id,
                workspace_id=m.workspace_id,
                role=m.role,
                created_at=m.created_at,
                user_email=m.user.email if m.user else None,
                user_name=m.user.full_name if m.user else None,
            )
        )
    return out


@router.post("/{workspace_id}/members", response_model=MembershipResponse)
async def add_workspace_member(
    workspace_id: str,
    req: MembershipCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(
        workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    # Check target user
    user = await db.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User to add not found")

    # Check existing membership
    res = await db.execute(
        select(Membership).where(
            Membership.workspace_id == workspace_id,
            Membership.user_id == req.user_id,
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member")

    membership = Membership(
        workspace_id=workspace_id,
        user_id=req.user_id,
        role=req.role,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)

    return MembershipResponse(
        id=membership.id,
        user_id=membership.user_id,
        workspace_id=membership.workspace_id,
        role=membership.role,
        created_at=membership.created_at,
        user_email=user.email,
        user_name=user.full_name,
    )
