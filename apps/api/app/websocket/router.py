import json
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import decode_access_token, hash_agent_key, hash_agent_token
from app.models.agent import Agent, AgentStatus
from app.models.user import User
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    agent_key: Optional[str] = Query(None),
    agent_token: Optional[str] = Query(None),   # device-flow token (rly_agent_xxx)
    agent_id: Optional[str] = Query(None),
    workspace_id: Optional[str] = Query(None),
):
    connection_id = str(uuid.uuid4())
    user_id: Optional[str] = None
    resolved_agent_id: Optional[str] = None
    client_name: str = "Anonymous"
    actor_type: str = "guest"

    async with async_session_factory() as db:
        # ── Priority 1: device-flow agent token (rly_agent_xxx) ──────────────
        if agent_token:
            token_hash = hash_agent_token(agent_token)
            result = await db.execute(
                select(Agent).where(Agent.agent_token_hash == token_hash)
            )
            agent = result.scalar_one_or_none()
            if agent:
                resolved_agent_id = agent.id
                workspace_id = agent.workspace_id
                client_name = agent.name
                actor_type = "agent"
                agent.status = AgentStatus.ONLINE
                await db.commit()

        # ── Priority 2: legacy api_key (backward compat) ─────────────────────
        elif agent_key:
            hashed = hash_agent_key(agent_key)
            result = await db.execute(select(Agent).where(Agent.api_key_hash == hashed))
            agent = result.scalar_one_or_none()
            if agent:
                resolved_agent_id = agent.id
                workspace_id = agent.workspace_id
                client_name = agent.name
                actor_type = "agent"
                agent.status = AgentStatus.ONLINE
                await db.commit()

        # ── Priority 3: user JWT + optional agent_id (X-Agent-ID pattern) ────
        elif token:
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                user_id = payload["sub"]
                user = await db.get(User, user_id)
                if user:
                    if agent_id:
                        agent = await db.get(Agent, agent_id)
                        if agent:
                            resolved_agent_id = agent.id
                            workspace_id = agent.workspace_id
                            client_name = agent.name
                            actor_type = "agent"
                            agent.status = AgentStatus.ONLINE
                            await db.commit()
                    if not resolved_agent_id:
                        client_name = user.full_name
                        actor_type = "human"

    agent_id = resolved_agent_id

    # Accept and register
    await manager.connect(
        websocket=websocket,
        connection_id=connection_id,
        user_id=user_id,
        agent_id=agent_id,
        workspace_id=workspace_id,
        metadata={"client_name": client_name, "actor_type": actor_type},
    )

    # Broadcast agent.online if this is an agent
    if agent_id and workspace_id:
        await manager.broadcast_to_workspace(
            workspace_id,
            WebSocketEvents.AGENT_ONLINE,
            {"agent_id": agent_id, "name": client_name},
        )

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                continue

            event = msg.get("event")
            data = msg.get("data", {})

            if event == "ping":
                await manager.send_personal(connection_id, WebSocketEvents.PONG, {"timestamp": data.get("timestamp")})

            elif event == "subscribe":
                channel = data.get("channel")
                if channel:
                    await manager.subscribe(connection_id, channel)
                    await manager.send_personal(connection_id, "subscribed", {"channel": channel})

            elif event == "unsubscribe":
                channel = data.get("channel")
                if channel:
                    await manager.unsubscribe(connection_id, channel)
                    await manager.send_personal(connection_id, "unsubscribed", {"channel": channel})

            elif event == WebSocketEvents.TYPING_START:
                room_id = data.get("room_id")
                thread_id = data.get("thread_id")
                typing_payload = {
                    "author_id": user_id or agent_id or connection_id,
                    "author_name": client_name,
                    "author_type": actor_type,
                    "room_id": room_id,
                    "thread_id": thread_id,
                }
                if thread_id:
                    await manager.broadcast_to_thread(
                        thread_id, WebSocketEvents.TYPING_START, typing_payload
                    )
                elif room_id:
                    await manager.broadcast_to_room(
                        room_id, WebSocketEvents.TYPING_START, typing_payload
                    )

            elif event == WebSocketEvents.TYPING_STOP:
                room_id = data.get("room_id")
                thread_id = data.get("thread_id")
                stop_payload = {
                    "author_id": user_id or agent_id or connection_id,
                    "author_name": client_name,
                    "room_id": room_id,
                    "thread_id": thread_id,
                }
                if thread_id:
                    await manager.broadcast_to_thread(
                        thread_id, WebSocketEvents.TYPING_STOP, stop_payload
                    )
                elif room_id:
                    await manager.broadcast_to_room(
                        room_id, WebSocketEvents.TYPING_STOP, stop_payload
                    )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WebSocket loop exception: {e}")
    finally:
        meta = await manager.disconnect(connection_id)
        if agent_id and workspace_id:
            # Check if agent has remaining connections
            if not manager.is_agent_online(agent_id):
                async with async_session_factory() as db:
                    agent = await db.get(Agent, agent_id)
                    if agent:
                        agent.status = AgentStatus.OFFLINE
                        await db.commit()
                await manager.broadcast_to_workspace(
                    workspace_id,
                    WebSocketEvents.AGENT_OFFLINE,
                    {"agent_id": agent_id, "name": client_name},
                )
