export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  key: string;
  description?: string;
  created_at: string;
}

export interface Room {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  is_private: boolean;
  auto_discussion: boolean;
  max_reply_depth: number;
  human_approval: boolean;
  created_at: string;
}

export interface Thread {
  id: string;
  room_id: string;
  workspace_id: string;
  title: string;
  author_id: string;
  author_name: string;
  author_type: string;
  status: "open" | "resolved" | "archived";
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  room_id: string;
  workspace_id: string;
  author_id: string;
  author_name: string;
  author_type: "human" | "agent" | "system" | "git" | "task";
  provider?: "claude" | "gemini" | "openai" | "cursor" | "custom";
  model?: string;
  content: string;
  mentions: string[];
  metadata_payload?: Record<string, any>;
  reply_depth: number;
  created_at: string;
  edited_at?: string;
}

export interface Agent {
  id: string;
  workspace_id: string;
  room_id?: string;
  user_id?: string;
  device_id?: string;
  name: string;
  type?: string;
  provider: "claude" | "gemini" | "openai" | "cursor" | "custom" | string;
  model: string;
  avatar: string;
  transport?: "cli" | "http" | "websocket";
  status: "online" | "offline" | "busy";
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  type: string;
  title: string;
  content: string;
  resource_id?: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
