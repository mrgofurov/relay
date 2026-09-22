from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_workspace_role, get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.models.workspace import WorkspaceRole
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(tags=["Projects"])


@router.get("/workspaces/{workspace_id}/projects", response_model=List[ProjectResponse])
async def list_workspace_projects(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(workspace_id, current_user, db)
    res = await db.execute(
        select(Project).where(Project.workspace_id == workspace_id).order_by(Project.name)
    )
    return res.scalars().all()


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse)
async def create_project(
    workspace_id: str,
    req: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_workspace_role(
        workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER]
    )

    # Check key uniqueness in workspace
    res = await db.execute(
        select(Project).where(
            Project.workspace_id == workspace_id,
            Project.key == req.key.upper(),
        )
    )
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project key '{req.key}' already exists in this workspace",
        )

    project = Project(
        workspace_id=workspace_id,
        name=req.name,
        key=req.key.upper(),
        description=req.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_workspace_role(project.workspace_id, current_user, db)
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    req: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await check_workspace_role(
        project.workspace_id, current_user, db, allowed_roles=[WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
    )

    if req.name is not None:
        project.name = req.name
    if req.description is not None:
        project.description = req.description

    await db.commit()
    await db.refresh(project)
    return project
