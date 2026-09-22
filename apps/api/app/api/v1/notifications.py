from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationMarkReadRequest, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    query = query.order_by(Notification.created_at.desc()).limit(limit)

    res = await db.execute(query)
    return res.scalars().all()


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    count = res.scalar_one() or 0
    return {"unread_count": count}


@router.post("/read")
async def mark_notifications_read(
    req: NotificationMarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.mark_all:
        await db.execute(
            update(Notification)
            .where(Notification.user_id == current_user.id)
            .values(is_read=True)
        )
    elif req.notification_ids:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == current_user.id,
                Notification.id.in_(req.notification_ids),
            )
            .values(is_read=True)
        )
    await db.commit()
    return {"status": "ok"}
