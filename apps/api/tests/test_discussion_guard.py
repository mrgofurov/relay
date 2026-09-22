import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_discussion_depth_limit(client: AsyncClient):
    # Setup user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "tester@example.com", "password": "pass12345password", "full_name": "Tester"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "tester@example.com", "password": "pass12345password"},
    )
    auth_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    ws = (await client.get("/api/v1/workspaces", headers=auth_headers)).json()[0]
    proj = (await client.post(
        f"/api/v1/workspaces/{ws['id']}/projects",
        headers=auth_headers,
        json={"name": "Core", "key": "CORE"},
    )).json()

    # Room with max depth of 2
    room = (await client.post(
        f"/api/v1/projects/{proj['id']}/rooms",
        headers=auth_headers,
        json={"name": "Discussions", "slug": "discussions", "max_reply_depth": 2, "auto_discussion": True},
    )).json()

    # Register an agent
    ag_resp = await client.post(
        f"/api/v1/workspaces/{ws['id']}/agents",
        headers=auth_headers,
        json={"name": "gemini-bot", "provider": "gemini"},
    )
    assert ag_resp.status_code == 200
    agent_key = ag_resp.json()["api_key"]
    agent_headers = {"Authorization": f"Bearer {agent_key}"}

    # Create thread with human message
    thread = (await client.post(
        f"/api/v1/rooms/{room['id']}/threads",
        headers=auth_headers,
        json={"title": "DB Schema Review", "initial_message": "@gemini-bot What do you think?"},
    )).json()

    # Agent reply 1 (Depth 1) - Allowed
    reply1 = await client.post(
        f"/api/v1/threads/{thread['id']}/messages",
        headers=agent_headers,
        json={"content": "Looks good, recommend index on workspace_id.", "message_type": "agent"},
    )
    assert reply1.status_code == 200
    assert reply1.json()["reply_depth"] == 1

    # Agent reply 2 (Depth 2) - Allowed
    reply2 = await client.post(
        f"/api/v1/threads/{thread['id']}/messages",
        headers=agent_headers,
        json={"content": "Claude confirms the index recommendation.", "message_type": "agent"},
    )
    assert reply2.status_code == 200
    assert reply2.json()["reply_depth"] == 2

    # Agent reply 3 (Depth 3 > max_reply_depth of 2) - Must be BLOCKED with 429
    reply3 = await client.post(
        f"/api/v1/threads/{thread['id']}/messages",
        headers=agent_headers,
        json={"content": "GPT agrees as well.", "message_type": "agent"},
    )
    assert reply3.status_code == 429
    assert "depth" in reply3.json()["detail"].lower()
