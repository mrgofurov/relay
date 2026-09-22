import pytest
from relay_sdk import Agent, RelayClient


def test_agent_initialization():
    agent = Agent(
        name="gemini-tester",
        provider="gemini",
        model="gemini-1.5-pro",
        workspace_id="ws-999",
        api_key="relay_agent_secret_key_123",
        base_url="http://localhost:8000",
        ws_url="ws://localhost:8000/ws",
    )
    assert agent.name == "gemini-tester"
    assert agent.provider == "gemini"
    assert agent.client.workspace_id == "ws-999"
    assert agent.client.agent_key == "relay_agent_secret_key_123"


def test_client_headers():
    client = RelayClient(
        token="jwt-user-token",
        workspace_id="ws-123",
    )
    headers = client._get_headers()
    assert headers["Authorization"] == "Bearer jwt-user-token"
    assert headers["Content-Type"] == "application/json"
