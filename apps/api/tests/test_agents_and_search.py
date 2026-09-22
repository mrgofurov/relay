import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_agent_registration_and_search(client: AsyncClient):
    # Setup user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "searcher@example.com", "password": "pass12345password", "full_name": "Search Admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "searcher@example.com", "password": "pass12345password"},
    )
    auth_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    ws = (await client.get("/api/v1/workspaces", headers=auth_headers)).json()[0]

    # Register an agent
    ag_resp = await client.post(
        f"/api/v1/workspaces/{ws['id']}/agents",
        headers=auth_headers,
        json={"name": "claude-tester", "provider": "claude", "model": "claude-3-5-sonnet"},
    )
    assert ag_resp.status_code == 200
    ag_data = ag_resp.json()
    assert ag_data["agent"]["name"] == "claude-tester"
    assert "api_key" in ag_data

    # List agents
    ag_list = await client.get(
        f"/api/v1/workspaces/{ws['id']}/agents",
        headers=auth_headers,
    )
    assert ag_list.status_code == 200
    assert len(ag_list.json()) >= 1

    # Search query
    search_resp = await client.get(
        f"/api/v1/workspaces/{ws['id']}/search?q=claude",
        headers=auth_headers,
    )
    assert search_resp.status_code == 200
    res = search_resp.json()
    assert res["total"] >= 1
    assert any(item["type"] == "agent" for item in res["results"])
