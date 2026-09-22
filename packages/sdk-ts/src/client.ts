import { EventEmitter } from "events";
import WebSocket from "isomorphic-ws";

export interface RelayClientOptions {
  baseUrl?: string;
  wsUrl?: string;
  token?: string;
  agentKey?: string;
  workspaceId?: string;
}

export interface SendMessageOptions {
  messageType?: "agent" | "human" | "system" | "git" | "task";
  provider?: string;
  model?: string;
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

export class RelayClient extends EventEmitter {
  private baseUrl: string;
  private wsUrl: string;
  private token?: string;
  private agentKey?: string;
  private workspaceId?: string;
  private ws: WebSocket | null = null;
  private isRunning: boolean = false;
  private reconnectInterval: number = 3000;

  constructor(options: RelayClientOptions = {}) {
    super();
    this.baseUrl = (options.baseUrl || "http://localhost:8000").replace(/\/$/, "");
    this.wsUrl = options.wsUrl || "ws://localhost:8000/ws";
    this.token = options.token;
    this.agentKey = options.agentKey;
    this.workspaceId = options.workspaceId;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (this.agentKey) {
      headers["Authorization"] = `Bearer ${this.agentKey}`;
    }
    return headers;
  }

  public async connect(): Promise<void> {
    this.isRunning = true;
    this.startReconnectLoop();
  }

  private startReconnectLoop(): void {
    if (!this.isRunning) return;

    const params: string[] = [];
    if (this.token) params.push(`token=${encodeURIComponent(this.token)}`);
    if (this.agentKey) params.push(`agent_key=${encodeURIComponent(this.agentKey)}`);
    if (this.workspaceId) params.push(`workspace_id=${encodeURIComponent(this.workspaceId)}`);

    const queryStr = params.length ? `?${params.join("&")}` : "";
    const fullWsUrl = `${this.wsUrl}${queryStr}`;

    try {
      this.ws = new WebSocket(fullWsUrl);

      this.ws.onopen = () => {
        this.emit("open");
        this.emit("connected");
      };

      this.ws.onmessage = (event: WebSocket.MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data.toString());
          const eventName = parsed.event;
          const data = parsed.data;

          this.emit("message", parsed);
          if (eventName) {
            this.emit(eventName, data);
          }
        } catch (e) {
          this.emit("error", e);
        }
      };

      this.ws.onclose = () => {
        this.emit("close");
        this.ws = null;
        if (this.isRunning) {
          setTimeout(() => this.startReconnectLoop(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (err) => {
        this.emit("error", err);
      };
    } catch (e) {
      if (this.isRunning) {
        setTimeout(() => this.startReconnectLoop(), this.reconnectInterval);
      }
    }
  }

  public async joinRoom(roomId: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "subscribe",
          data: { channel: `room:${roomId}` },
        })
      );
    }
  }

  public async sendMessage(
    threadId: string,
    content: string,
    options: SendMessageOptions = {}
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        content,
        message_type: options.messageType || "agent",
        provider: options.provider,
        model: options.model,
        mentions: options.mentions || [],
        metadata_payload: options.metadata || {},
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to send message: ${errText}`);
    }
    return res.json();
  }

  public async reply(threadId: string, content: string): Promise<any> {
    return this.sendMessage(threadId, content);
  }

  public async mention(
    threadId: string,
    targetHandle: string,
    content: string
  ): Promise<any> {
    const handle = `@${targetHandle.replace(/^@/, "")}`;
    const fullContent = `${handle} ${content}`;
    return this.sendMessage(threadId, fullContent, { mentions: [handle] });
  }

  public watch(callback: (event: any) => void): void {
    this.on("message.created", callback);
    this.on("agent.mentioned", callback);
    this.on("thread.created", callback);
    this.on("git.push", callback);
  }

  public disconnect(): void {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
