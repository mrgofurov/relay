import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_device_pairing_flow(client: AsyncClient):
    # 1. Register and login a developer
    await client.post(
        "/api/v1/auth/register",
        json={"email": "pairingdev@example.com", "password": "pass12345password", "full_name": "Pairing Developer"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "pairingdev@example.com", "password": "pass12345password"},
    )
    auth_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    ws = (await client.get("/api/v1/workspaces", headers=auth_headers)).json()[0]

    # Create project and room
    proj = (await client.post(
        f"/api/v1/workspaces/{ws['id']}/projects",
        headers=auth_headers,
        json={"name": "Relay MVP", "key": "MVP"},
    )).json()

    room = (await client.post(
        f"/api/v1/projects/{proj['id']}/rooms",
        headers=auth_headers,
        json={"name": "general", "slug": "general"},
    )).json()

    # 2. Browser requests temporary 60-second pairing code
    pair_resp = await client.post(
        "/api/v1/device-pairings",
        headers=auth_headers,
        json={
            "agent_name": "Murtazo Gemini",
            "agent_type": "gemini",
            "room_id": room["id"],
        },
    )
    assert pair_resp.status_code == 200
    pair_data = pair_resp.json()
    code = pair_data["code"]
    assert len(code) == 9  # 4 chars - 4 chars (e.g. AB7K-92QP)
    assert pair_data["expires_in_seconds"] == 60
    assert "relay login" in pair_data["instructions"][0]
    assert f"relay agent attach {code}" in pair_data["instructions"][1]

    # 3. Check status is pending
    status_resp = await client.get(
        f"/api/v1/device-pairings/{code}/status",
        headers=auth_headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "pending"

    # 4. CLI attaches device
    attach_resp = await client.post(
        "/api/v1/device-pairings/attach",
        headers=auth_headers,
        json={
            "code": code,
            "device_id": "test-device-123",
        },
    )
    assert attach_resp.status_code == 200
    attach_data = attach_resp.json()
    assert attach_data["ok"] is True
    assert attach_data["agent_name"] == "Murtazo Gemini"
    assert attach_data["agent_type"] == "gemini"
    assert attach_data["room_id"] == room["id"]

    # 5. Check status is now connected
    status_resp2 = await client.get(
        f"/api/v1/device-pairings/{code}/status",
        headers=auth_headers,
    )
    assert status_resp2.status_code == 200
    assert status_resp2.json()["status"] == "connected"
    assert status_resp2.json()["agent_id"] == attach_data["agent_id"]

    # 6. Verify single-use: attaching again fails
    reuse_resp = await client.post(
        "/api/v1/device-pairings/attach",
        headers=auth_headers,
        json={"code": code},
    )
    assert reuse_resp.status_code == 400
    assert "already been used" in reuse_resp.json()["detail"]
