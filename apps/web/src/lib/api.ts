import { Agent, Message, Project, Room, Thread, Workspace } from "../types";

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
}

export class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("relay_token");
    }
  }

  public setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("relay_token", token);
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("relay_token");
    }
    return this.token;
  }

  public clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("relay_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Request failed with status ${res.status}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  }


  // Auth
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const data = await this.request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(email: string, password: string, full_name: string): Promise<any> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
  }

  async getMe(): Promise<any> {
    return this.request("/auth/me");
  }

  // Workspaces & Projects
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async getProjects(workspaceId: string): Promise<Project[]> {
    return this.request<Project[]>(`/workspaces/${workspaceId}/projects`);
  }

  async createProject(workspaceId: string, name: string, key: string, description?: string): Promise<Project> {
    return this.request<Project>(`/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify({ name, key, description }),
    });
  }

  // Rooms
  async getRooms(projectId: string): Promise<Room[]> {
    return this.request<Room[]>(`/projects/${projectId}/rooms`);
  }

  async createRoom(projectId: string, name: string, slug: string, description?: string): Promise<Room> {
    return this.request<Room>(`/projects/${projectId}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name, slug, description }),
    });
  }

  async updateRoomSettings(roomId: string, settings: { auto_discussion: boolean; max_reply_depth: number; human_approval: boolean }): Promise<Room> {
    return this.request<Room>(`/rooms/${roomId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  // Threads
  async getThreads(roomId: string): Promise<Thread[]> {
    return this.request<Thread[]>(`/rooms/${roomId}/threads`);
  }

  async createThread(roomId: string, title: string, initial_message?: string): Promise<Thread> {
    return this.request<Thread>(`/rooms/${roomId}/threads`, {
      method: "POST",
      body: JSON.stringify({ title, initial_message }),
    });
  }

  async resolveThread(threadId: string): Promise<Thread> {
    return this.request<Thread>(`/threads/${threadId}/resolve`, {
      method: "POST",
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    return this.request(`/threads/${threadId}`, {
      method: "DELETE",
    });
  }


  // Messages
  async getMessages(threadId: string): Promise<Message[]> {
    return this.request<Message[]>(`/threads/${threadId}/messages`);
  }

  async sendMessage(
    threadId: string,
    content: string,
    message_type: string = "human",
    provider?: string,
    model?: string,
    mentions: string[] = []
  ): Promise<Message> {
    return this.request<Message>(`/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type,
        provider,
        model,
        mentions,
      }),
    });
  }

  // Agents
  async getAgents(workspaceId: string): Promise<Agent[]> {
    return this.request<Agent[]>(`/workspaces/${workspaceId}/agents`);
  }

  // Device Pairing Flow (native CLI sessions)
  async createDevicePairing(
    agentName: string,
    agentType: string,
    roomId: string
  ): Promise<{
    code: string;
    room_id: string;
    room_name: string;
    agent_name: string;
    agent_type: string;
    expires_at: string;
    expires_in_seconds: number;
    instructions: string[];
  }> {
    return this.request(`/device-pairings`, {
      method: "POST",
      body: JSON.stringify({ agent_name: agentName, agent_type: agentType, room_id: roomId }),
    });
  }

  async getPairingStatus(code: string): Promise<{
    code: string;
    status: "pending" | "connected" | "expired";
    agent_id?: string;
    agent_name: string;
    room_id: string;
    connected_at: string | null;
  }> {
    return this.request(`/device-pairings/${code}/status`);
  }

  async deleteAgent(agentId: string): Promise<void> {
    return this.request(`/agents/${agentId}`, { method: "DELETE" });
  }


  // Search
  async search(workspaceId: string, query: string): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    return this.request<any[]>("/notifications");
  }
}

export const api = new ApiClient();
