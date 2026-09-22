import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_thread_first_communication(client: AsyncClient):
    # Setup user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "lead@example.com", "password": "pass12345password", "full_name": "Tech Lead"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "lead@example.com", "password": "pass12345password"},
    )
    auth_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    ws = (await client.get("/api/v1/workspaces", headers=auth_headers)).json()[0]
    proj = (await client.post(
        f"/api/v1/workspaces/{ws['id']}/projects",
        headers=auth_headers,
        json={"name": "Backend", "key": "BE"},
    )).json()

    room = (await client.post(
        f"/api/v1/projects/{proj['id']}/rooms",
        headers=auth_headers,
        json={"name": "API Contract", "slug": "api-contract"},
    )).json()

    # Create Thread
    thread_resp = await client.post(
        f"/api/v1/rooms/{room['id']}/threads",
        headers=auth_headers,
        json={"title": "Product DTO v2", "initial_message": "Let's review the new schema for DTO."},
    )
    assert thread_resp.status_code == 200
    thread = thread_resp.json()
    assert thread["title"] == "Product DTO v2"
    assert thread["message_count"] == 1

    # Post Message in Thread
    msg_resp = await client.post(
        f"/api/v1/threads/{thread['id']}/messages",
        headers=auth_headers,
        json={"content": "Here is the proposed JSON schema.", "message_type": "human"},
    )
    assert msg_resp.status_code == 200
    msg = msg_resp.json()
    assert msg["content"] == "Here is the proposed JSON schema."

    # Verify messages remain inside thread
    list_msgs = await client.get(
        f"/api/v1/threads/{thread['id']}/messages",
        headers=auth_headers,
    )
    assert list_msgs.status_code == 200
    all_msgs = list_msgs.json()
    assert len(all_msgs) == 2
