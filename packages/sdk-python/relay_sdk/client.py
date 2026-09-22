import asyncio
import json
import logging
from typing import Any, Callable, Dict, List, Optional
import httpx
import websockets

logger = logging.getLogger("relay-sdk")


class RelayClient:
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        ws_url: str = "ws://localhost:8000/ws",
        token: Optional[str] = None,
        agent_key: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.ws_url = ws_url
        self.token = token
        self.agent_key = agent_key
        self.workspace_id = workspace_id
        self._http_client = httpx.AsyncClient(base_url=self.base_url)
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._running = False
        self._reconnect_interval = 3

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        elif self.agent_key:
            headers["Authorization"] = f"Bearer {self.agent_key}"
        return headers

    def on(self, event_name: str, handler: Callable):
        if event_name not in self._event_handlers:
            self._event_handlers[event_name] = []
        self._event_handlers[event_name].append(handler)
        return handler

    async def connect(self):
        """Establish persistent WebSocket connection with automatic reconnect."""
        self._running = True
        params = []
        if self.token:
            params.append(f"token={self.token}")
        elif self.agent_key:
            params.append(f"agent_key={self.agent_key}")
        if self.workspace_id:
            params.append(f"workspace_id={self.workspace_id}")

        query_str = f"?{'&'.join(params)}" if params else ""
        url = f"{self.ws_url}{query_str}"

        while self._running:
            try:
                logger.info(f"Connecting to Relay WebSocket at {url}...")
                async with websockets.connect(url) as ws:
                    self._ws = ws
                    logger.info("Connected to Relay WebSocket!")
                    await self._dispatch("connected", {"status": "connected"})

                    while self._running:
                        msg = await ws.recv()
                        try:
                            payload = json.loads(msg)
                            ev = payload.get("event")
                            data = payload.get("data", {})
                            await self._dispatch(ev, data)
                        except Exception as e:
                            logger.error(f"Error handling message: {e}")
            except (websockets.ConnectionClosed, Exception) as e:
                logger.warning(f"Connection lost ({e}). Reconnecting in {self._reconnect_interval}s...")
                await self._dispatch("disconnected", {"error": str(e)})
                await asyncio.sleep(self._reconnect_interval)

    async def _dispatch(self, event_name: str, data: Any):
        handlers = self._event_handlers.get(event_name, [])
        for h in handlers:
            try:
                if asyncio.iscoroutinefunction(h):
                    await h(data)
                else:
                    h(data)
            except Exception as ex:
                logger.error(f"Error in handler for {event_name}: {ex}")

    async def join_room(self, room_id: str):
        if self._ws:
            await self._ws.send(
                json.dumps({"event": "subscribe", "data": {"channel": f"room:{room_id}"}})
            )

    async def send_message(
        self,
        thread_id: str,
        content: str,
        message_type: str = "agent",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        mentions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        resp = await self._http_client.post(
            f"/api/v1/threads/{thread_id}/messages",
            headers=self._get_headers(),
            json={
                "content": content,
                "message_type": message_type,
                "provider": provider,
                "model": model,
                "mentions": mentions or [],
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def reply(self, thread_id: str, content: str) -> Dict[str, Any]:
        return await self.send_message(thread_id, content)

    async def close(self):
        self._running = False
        if self._ws:
            await self._ws.close()
        await self._http_client.aclose()
