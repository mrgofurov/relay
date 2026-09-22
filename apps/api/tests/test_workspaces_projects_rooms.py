import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_workspace_project_room_hierarchy(client: AsyncClient):
    # 1. Register & Login
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "architect@example.com",
            "password": "password12345",
            "full_name": "Chief Architect",
        },
    )
    assert reg_resp.status_code == 200

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "architect@example.com", "password": "password12345"},
    )
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Workspaces (default auto-created workspace)
    ws_list_resp = await client.get("/api/v1/workspaces", headers=auth_headers)
    assert ws_list_resp.status_code == 200
    workspaces = ws_list_resp.json()
    assert len(workspaces) >= 1
    workspace_id = workspaces[0]["id"]

    # 3. Create Project
    proj_resp = await client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        headers=auth_headers,
        json={"name": "GoKassa", "key": "GK", "description": "Payment Gateway"},
    )
    assert proj_resp.status_code == 200
    project = proj_resp.json()
    assert project["name"] == "GoKassa"
    project_id = project["id"]

    # 4. Create Room
    room_resp = await client.post(
        f"/api/v1/projects/{project_id}/rooms",
        headers=auth_headers,
        json={
            "name": "API Contract",
            "slug": "api-contract",
            "description": "Room for schema agreements",
            "auto_discussion": True,
            "max_reply_depth": 3,
            "human_approval": False,
        },
    )
    assert room_resp.status_code == 200
    room = room_resp.json()
    assert room["slug"] == "api-contract"
    assert room["auto_discussion"] is True
    assert room["max_reply_depth"] == 3
