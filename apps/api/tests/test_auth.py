import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register user
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dev@example.com",
            "password": "supersecurepassword123",
            "full_name": "Dev User",
        },
    )
    assert reg_resp.status_code == 200
    user_data = reg_resp.json()
    assert user_data["email"] == "dev@example.com"
    assert "id" in user_data

    # Login user
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "dev@example.com",
            "password": "supersecurepassword123",
        },
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Verify profile
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "dev@example.com"
