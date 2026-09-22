package relay

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Event struct {
	Event   string          `json:"event"`
	Channel string          `json:"channel,omitempty"`
	Data    json.RawMessage `json:"data"`
}

type ClientOptions struct {
	BaseURL     string
	WSURL       string
	Token       string
	AgentKey    string
	WorkspaceID string
}

type Client struct {
	opts       ClientOptions
	conn       *websocket.Conn
	mu         sync.Mutex
	eventsChan chan Event
	handlers   map[string][]func(Event)
	running    bool
	httpClient *http.Client
}

func NewClient(opts ClientOptions) *Client {
	if opts.BaseURL == "" {
		opts.BaseURL = "http://localhost:8000"
	}
	if opts.WSURL == "" {
		opts.WSURL = "ws://localhost:8000/ws"
	}
	return &Client{
		opts:       opts,
		eventsChan: make(chan Event, 100),
		handlers:   make(map[string][]func(Event)),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Connect() error {
	c.running = true
	go c.reconnectLoop()
	return nil
}

func (c *Client) reconnectLoop() {
	for c.running {
		u, err := url.Parse(c.opts.WSURL)
		if err != nil {
			time.Sleep(3 * time.Second)
			continue
		}
		q := u.Query()
		if c.opts.Token != "" {
			q.Set("token", c.opts.Token)
		} else if c.opts.AgentKey != "" {
			q.Set("agent_key", c.opts.AgentKey)
		}
		if c.opts.WorkspaceID != "" {
			q.Set("workspace_id", c.opts.WorkspaceID)
		}
		u.RawQuery = q.Encode()

		conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
		if err != nil {
			time.Sleep(3 * time.Second)
			continue
		}

		c.mu.Lock()
		c.conn = conn
		c.mu.Unlock()

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			var ev Event
			if err := json.Unmarshal(msg, &ev); err == nil {
				select {
				case c.eventsChan <- ev:
				default:
				}
				c.mu.Lock()
				handlers := c.handlers[ev.Event]
				c.mu.Unlock()
				for _, h := range handlers {
					go h(ev)
				}
			}
		}

		c.mu.Lock()
		c.conn = nil
		c.mu.Unlock()
		time.Sleep(3 * time.Second)
	}
}

func (c *Client) JoinRoom(roomID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		return fmt.Errorf("not connected")
	}
	sub := map[string]interface{}{
		"event": "subscribe",
		"data": map[string]string{
			"channel": fmt.Sprintf("room:%s", roomID),
		},
	}
	return c.conn.WriteJSON(sub)
}

func (c *Client) SendMessage(threadID, content string, mentions []string) error {
	reqBody, _ := json.Marshal(map[string]interface{}{
		"content":      content,
		"message_type": "agent",
		"mentions":     mentions,
	})

	endpoint := fmt.Sprintf("%s/api/v1/threads/%s/messages", strings.TrimRight(c.opts.BaseURL, "/"), threadID)
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.opts.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.opts.Token)
	} else if c.opts.AgentKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.opts.AgentKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("send message failed: %s", string(b))
	}
	return nil
}

func (c *Client) Reply(threadID, content string) error {
	return c.SendMessage(threadID, content, nil)
}

func (c *Client) Mention(threadID, targetHandle, content string) error {
	handle := "@" + strings.TrimPrefix(targetHandle, "@")
	fullContent := fmt.Sprintf("%s %s", handle, content)
	return c.SendMessage(threadID, fullContent, []string{handle})
}

func (c *Client) Watch() <-chan Event {
	return c.eventsChan
}

func (c *Client) On(event string, handler func(Event)) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handlers[event] = append(c.handlers[event], handler)
}

func (c *Client) Close() {
	c.running = false
	c.mu.Lock()
	if c.conn != nil {
		c.conn.Close()
	}
	c.mu.Unlock()
}
