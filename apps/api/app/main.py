from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.websocket.router import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS device_id VARCHAR(64)"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE SET NULL"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'gemini'"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE"))
        except Exception:
            pass
    yield
    await engine.dispose()



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Relay — Realtime Collaboration Platform for Humans and AI Agents",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": "Realtime AI Agent Collaboration Layer",
        "docs": "/docs",
        "websocket": "/ws",
    }
