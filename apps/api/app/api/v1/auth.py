from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.workspace import Membership, Workspace, WorkspaceRole
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register_user(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    res = await db.execute(select(User).where(User.email == req.email.lower()))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    user = User(
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
    )
    db.add(user)
    await db.flush()

    # Create a default personal workspace for the user
    ws_slug = f"{req.full_name.lower().replace(' ', '-')}-workspace"[:50]
    workspace = Workspace(
        name=f"{req.full_name}'s Workspace",
        slug=ws_slug,
        owner_id=user.id,
    )
    db.add(workspace)
    await db.flush()

    # Add owner membership
    membership = Membership(
        user_id=user.id,
        workspace_id=workspace.id,
        role=WorkspaceRole.OWNER,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login_user(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email.lower()))
    user = res.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        extra_claims={"email": user.email, "name": user.full_name},
    )
    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    if req.password is not None:
        current_user.hashed_password = get_password_hash(req.password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
