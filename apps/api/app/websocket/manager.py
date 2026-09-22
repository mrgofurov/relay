import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # connection_id -> metadata (user_id, agent_id, workspace_id, etc.)
        self.connection_meta: Dict[str, Dict[str, Any]] = {}
        # channel_name (e.g., "room:<id>", "workspace:<id>") -> set of connection_ids
        self.channel_subscribers: Dict[str, Set[str]] = {}
        # user_id -> set of connection_ids
        self.user_connections: Dict[str, Set[str]] = {}
        # agent_id -> set of connection_ids
        self.agent_connections: Dict[str, Set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        await websocket.accept()
        async with self._lock:
            self.active_connections[connection_id] = websocket
            self.connection_meta[connection_id] = {
                "user_id": user_id,
                "agent_id": agent_id,
                "workspace_id": workspace_id,
                **(metadata or {}),
            }

            if user_id:
                if user_id not in self.user_connections:
                    self.user_connections[user_id] = set()
                self.user_connections[user_id].add(connection_id)

            if agent_id:
                if agent_id not in self.agent_connections:
                    self.agent_connections[agent_id] = set()
                self.agent_connections[agent_id].add(connection_id)

            if workspace_id:
                ws_channel = f"workspace:{workspace_id}"
                if ws_channel not in self.channel_subscribers:
                    self.channel_subscribers[ws_channel] = set()
                self.channel_subscribers[ws_channel].add(connection_id)

        logger.info(
            f"WebSocket client connected: {connection_id} (user={user_id}, agent={agent_id}, ws={workspace_id})"
        )

    async def disconnect(self, connection_id: str):
        async with self._lock:
            meta = self.connection_meta.pop(connection_id, {})
            self.active_connections.pop(connection_id, None)

            user_id = meta.get("user_id")
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

            agent_id = meta.get("agent_id")
            if agent_id and agent_id in self.agent_connections:
                self.agent_connections[agent_id].discard(connection_id)
                if not self.agent_connections[agent_id]:
                    del self.agent_connections[agent_id]

            for channel, subs in list(self.channel_subscribers.items()):
                subs.discard(connection_id)
                if not subs:
                    del self.channel_subscribers[channel]

        logger.info(f"WebSocket client disconnected: {connection_id}")
        return meta

    async def subscribe(self, connection_id: str, channel: str):
        async with self._lock:
            if channel not in self.channel_subscribers:
                self.channel_subscribers[channel] = set()
            self.channel_subscribers[channel].add(connection_id)

    async def unsubscribe(self, connection_id: str, channel: str):
        async with self._lock:
            if channel in self.channel_subscribers:
                self.channel_subscribers[channel].discard(connection_id)
                if not self.channel_subscribers[channel]:
                    del self.channel_subscribers[channel]

    async def send_personal(self, connection_id: str, event: str, data: Any):
        ws = self.active_connections.get(connection_id)
        if ws:
            payload = json.dumps({"event": event, "data": data})
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to {connection_id}: {e}")

    async def broadcast_to_channel(self, channel: str, event: str, data: Any, exclude_conn_id: Optional[str] = None):
        subs = list(self.channel_subscribers.get(channel, set()))
        if not subs:
            return
        payload = json.dumps({"event": event, "channel": channel, "data": data})
        dead_conns = []
        for conn_id in subs:
            if conn_id == exclude_conn_id:
                continue
            ws = self.active_connections.get(conn_id)
            if ws:
                try:
                    await ws.send_text(payload)
                except Exception as e:
                    logger.warning(f"Failed send to {conn_id}: {e}")
                    dead_conns.append(conn_id)
        for dc in dead_conns:
            await self.disconnect(dc)

    async def broadcast_to_workspace(self, workspace_id: str, event: str, data: Any):
        await self.broadcast_to_channel(f"workspace:{workspace_id}", event, data)

    async def broadcast_to_room(self, room_id: str, event: str, data: Any):
        await self.broadcast_to_channel(f"room:{room_id}", event, data)

    async def broadcast_to_thread(self, thread_id: str, event: str, data: Any):
        await self.broadcast_to_channel(f"thread:{thread_id}", event, data)

    async def send_to_user(self, user_id: str, event: str, data: Any):
        conns = list(self.user_connections.get(user_id, set()))
        payload = json.dumps({"event": event, "data": data})
        for conn_id in conns:
            ws = self.active_connections.get(conn_id)
            if ws:
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass

    async def send_to_agent(self, agent_id: str, event: str, data: Any):
        conns = list(self.agent_connections.get(agent_id, set()))
        payload = json.dumps({"event": event, "data": data})
        for conn_id in conns:
            ws = self.active_connections.get(conn_id)
            if ws:
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass

    def is_agent_online(self, agent_id: str) -> bool:
        return agent_id in self.agent_connections and len(self.agent_connections[agent_id]) > 0


manager = ConnectionManager()
