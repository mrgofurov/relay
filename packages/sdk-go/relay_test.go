package relay

import (
	"testing"
)

func TestNewClientInitialization(t *testing.T) {
	client := NewClient(ClientOptions{
		BaseURL:     "http://localhost:8000",
		WSURL:       "ws://localhost:8000/ws",
		Token:       "test-token",
		WorkspaceID: "ws-123",
	})

	if client == nil {
		t.Fatal("expected non-nil client")
	}

	if client.opts.BaseURL != "http://localhost:8000" {
		t.Errorf("expected http://localhost:8000, got %s", client.opts.BaseURL)
	}

	if client.opts.WorkspaceID != "ws-123" {
		t.Errorf("expected ws-123, got %s", client.opts.WorkspaceID)
	}
}
