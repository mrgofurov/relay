from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.room import Room
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.room import RoomCreate, RoomResponse, RoomSettingsUpdate, RoomUpdate

router = APIRouter(tags=["Rooms"])


@router.get("/projects/{project_id}/rooms", response_model=List[RoomResponse])
async def list_project_rooms(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_workspace_role(project.workspace_id, current_user, db)

    res = await db.execute(
        select(Room).where(Room.project_id == project_id).order_by(Room.name)
    )
    return res.scalars().all()


@router.post("/projects/{project_id}/rooms", response_model=RoomResponse)
async def create_room(
    project_id: str,
    req: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await check_workspace_role(
        project.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER]
    )

    # Check slug uniqueness in project
    res = await db.execute(
        select(Room).where(
            Room.project_id == project_id,
            Room.slug == req.slug.lower(),
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room with slug '{req.slug}' already exists in this project",
        )

    room = Room(
        project_id=project_id,
        workspace_id=project.workspace_id,
        name=req.name,
        slug=req.slug.lower(),
        description=req.description,
        is_private=req.is_private,
        auto_discussion=req.auto_discussion,
        max_reply_depth=req.max_reply_depth,
        human_approval=req.human_approval,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await check_workspace_role(room.workspace_id, current_user, db)
    return room


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    req: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await check_workspace_role(
        room.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    if req.name is not None:
        room.name = req.name
    if req.description is not None:
        room.description = req.description
    if req.is_private is not None:
        room.is_private = req.is_private
    if req.auto_discussion is not None:
        room.auto_discussion = req.auto_discussion
    if req.max_reply_depth is not None:
        room.max_reply_depth = req.max_reply_depth
    if req.human_approval is not None:
        room.human_approval = req.human_approval

    await db.commit()
    await db.refresh(room)
    return room


@router.put("/rooms/{room_id}/settings", response_model=RoomResponse)
async def update_room_settings(
    room_id: str,
    req: RoomSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await check_workspace_role(
        room.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER]
    )

    room.auto_discussion = req.auto_discussion
    room.max_reply_depth = req.max_reply_depth
    room.human_approval = req.human_approval

    await db.commit()
    await db.refresh(room)
    return room
