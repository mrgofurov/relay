import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_github_webhook_creates_git_events(client: AsyncClient):
    # Setup user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "gitadmin@example.com", "password": "pass12345password", "full_name": "Git Admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "gitadmin@example.com", "password": "pass12345password"},
    )
    auth_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    ws = (await client.get("/api/v1/workspaces", headers=auth_headers)).json()[0]

    # Post GitHub push webhook
    webhook_payload = {
        "ref": "refs/heads/feat/auth",
        "repository": {"name": "relay-core", "full_name": "relay-ai/relay-core"},
        "sender": {"login": "claude-agent"},
        "commits": [
            {
                "id": "e4d2a1b98c3f4e5a",
                "message": "feat: add JWT auth middleware",
                "author": {"name": "Claude", "email": "claude@ai.local"},
                "added": ["auth.py", "tokens.py"],
                "removed": [],
                "modified": ["main.py"],
            }
        ],
    }

    wh_resp = await client.post(
        f"/api/v1/webhooks/github/{ws['id']}",
        headers={"X-GitHub-Event": "push", "Content-Type": "application/json"},
        json=webhook_payload,
    )
    assert wh_resp.status_code == 200
    res_data = wh_resp.json()
    assert res_data["status"] == "success"
    thread_id = res_data["thread_id"]

    # Verify created thread and message in git-events room
    thread_resp = await client.get(f"/api/v1/threads/{thread_id}", headers=auth_headers)
    assert thread_resp.status_code == 200
    assert "feat/auth" in thread_resp.json()["title"]

    msg_resp = await client.get(f"/api/v1/threads/{thread_id}/messages", headers=auth_headers)
    assert msg_resp.status_code == 200
    messages = msg_resp.json()
    assert len(messages) >= 1
    assert messages[0]["author_type"] == "git"
    assert "claude-agent" in messages[0]["content"]
