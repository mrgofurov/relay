import re
from typing import List, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.notification import Notification
from app.models.user import User
from app.models.workspace import Membership
from app.websocket.events import WebSocketEvents
from app.websocket.manager import manager

MENTION_REGEX = re.compile(r"@([\w-]+)")


def extract_mentions(text: str) -> List[str]:
    matches = MENTION_REGEX.findall(text)
    return [f"@{m.lower()}" for m in set(matches)]


async def process_mentions(
    db: AsyncSession,
    workspace_id: str,
    room_id: str,
    thread_id: str,
    message_id: str,
    author_id: str,
    author_name: str,
    content: str,
    mentions: List[str],
) -> List[str]:
    if not mentions:
        return []

    # Get all agents in workspace
    agents_res = await db.execute(
        select(Agent).where(Agent.workspace_id == workspace_id)
    )
    agents = agents_res.scalars().all()
    agent_by_tag = {}
    for agent in agents:
        agent_by_tag[agent.name.lower()] = agent
        agent_by_tag[agent.name.lower().replace(" ", "-")] = agent
        agent_by_tag[agent.name.lower().replace(" ", "_")] = agent
        if getattr(agent, "type", None):
            agent_by_tag[agent.type.lower()] = agent

    # Get all members in workspace
    members_res = await db.execute(
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.workspace_id == workspace_id)
    )
    members = members_res.scalars().all()
    user_by_name = {m.full_name.lower().replace(" ", "-"): m for m in members}

    is_everyone = "@everyone" in mentions

    for mention in mentions:
        tag = mention.lstrip("@").lower()

        # Check if agent was mentioned
        target_agent = agent_by_tag.get(tag)
        if target_agent:
            # Do NOT notify an agent about its own message (prevents infinite self-echo loop)
            if target_agent.id == author_id:
                continue
            # Send targeted event to the agent over websocket
            await manager.send_to_agent(
                target_agent.id,
                "agent.mentioned",
                {
                    "workspace_id": workspace_id,
                    "room_id": room_id,
                    "thread_id": thread_id,
                    "message_id": message_id,
                    "author_name": author_name,
                    "content": content,
                    "mentions": mentions,
                },
            )

        # Check if user was mentioned or @everyone
        target_user = user_by_name.get(tag)
        if target_user:
            notif = Notification(
                user_id=target_user.id,
                workspace_id=workspace_id,
                type="mention",
                title=f"{author_name} mentioned you",
                content=content[:200],
                resource_id=thread_id,
                data={"room_id": room_id, "thread_id": thread_id, "message_id": message_id},
            )
            db.add(notif)
            await manager.send_to_user(
                target_user.id,
                WebSocketEvents.NOTIFICATION,
                {
                    "type": "mention",
                    "title": f"{author_name} mentioned you",
                    "content": content[:200],
                    "thread_id": thread_id,
                },
            )

    if is_everyone:
        for member in members:
            notif = Notification(
                user_id=member.id,
                workspace_id=workspace_id,
                type="mention",
                title=f"{author_name} mentioned @everyone",
                content=content[:200],
                resource_id=thread_id,
                data={"room_id": room_id, "thread_id": thread_id, "message_id": message_id},
            )
            db.add(notif)
            await manager.send_to_user(
                member.id,
                WebSocketEvents.NOTIFICATION,
                {
                    "type": "mention",
                    "title": f"{author_name} mentioned @everyone",
                    "content": content[:200],
                    "thread_id": thread_id,
                },
            )

    return mentions
