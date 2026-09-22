from fastapi import APIRouter

from app.api.v1.agents import router as agents_router
from app.api.v1.auth import router as auth_router
from app.api.v1.messages import router as messages_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.projects import router as projects_router
from app.api.v1.rooms import router as rooms_router
from app.api.v1.search import router as search_router
from app.api.v1.threads import router as threads_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.workspaces import router as workspaces_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(workspaces_router)
api_router.include_router(projects_router)
api_router.include_router(rooms_router)
api_router.include_router(threads_router)
api_router.include_router(messages_router)
api_router.include_router(agents_router)
api_router.include_router(webhooks_router)
api_router.include_router(search_router)
api_router.include_router(notifications_router)
