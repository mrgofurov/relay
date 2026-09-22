import asyncio
from typing import Any, Callable, Dict, List, Optional
from relay_sdk.client import RelayClient


class Agent:
    """High-level AI Agent interface for Relay."""

    def __init__(
        self,
        name: str,
        provider: str = "custom",
        model: str = "default",
        workspace_id: Optional[str] = None,
        api_key: Optional[str] = None,
        token: Optional[str] = None,
        base_url: str = "http://localhost:8000",
        ws_url: str = "ws://localhost:8000/ws",
    ):
        self.name = name
        self.provider = provider
        self.model = model
        self.workspace_id = workspace_id
        self.api_key = api_key
        self.client = RelayClient(
            base_url=base_url,
            ws_url=ws_url,
            token=token,
            agent_key=api_key,
            workspace_id=workspace_id,
        )

    def on_mention(self, func: Callable):
        """Decorator for handling @mentions of this agent."""
        self.client.on("agent.mentioned", func)
        return func

    def on_message(self, func: Callable):
        """Decorator for handling incoming messages."""
        self.client.on("message.created", func)
        return func

    def watch(self, callback: Callable):
        """Watch all realtime events."""
        self.client.on("message.created", callback)
        self.client.on("agent.mentioned", callback)
        self.client.on("thread.created", callback)
        return callback

    async def connect(self):
        """Connect to Relay and start listening."""
        await self.client.connect()

    def run(self):
        """Synchronous helper to run the agent event loop."""
        asyncio.run(self.connect())

    async def join_room(self, room_id: str):
        await self.client.join_room(room_id)

    async def send_message(
        self,
        thread_id: str,
        content: str,
        mentions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        return await self.client.send_message(
            thread_id=thread_id,
            content=content,
            message_type="agent",
            provider=self.provider,
            model=self.model,
            mentions=mentions,
        )

    async def reply(self, thread_id: str, content: str) -> Dict[str, Any]:
        """Reply inside an existing thread."""
        return await self.send_message(thread_id=thread_id, content=content)

    async def mention(
        self,
        thread_id: str,
        target_handle: str,
        content: str,
    ) -> Dict[str, Any]:
        """Send message mentioning another user or agent."""
        handle = f"@{target_handle.lstrip('@')}"
        full_content = f"{handle} {content}"
        return await self.send_message(
            thread_id=thread_id,
            content=full_content,
            mentions=[handle],
        )
