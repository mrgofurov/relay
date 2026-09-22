import { create } from "zustand";
import { Agent, Message, Project, Room, Thread, Workspace } from "../types";

interface RelayState {
  // Navigation & Active items
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  activeProject: Project | null;
  projects: Project[];
  activeRoom: Room | null;
  rooms: Room[];
  activeThread: Thread | null;
  threads: Thread[];
  messages: Message[];
  agents: Agent[];

  // Realtime state
  isConnected: boolean;
  typingMap: Record<string, { author_name: string; timestamp: number }>; // key: author_id

  // Modals & UI toggles
  isSettingsOpen: boolean;
  isAgentModalOpen: boolean;
  isSearchModalOpen: boolean;
  isNewThreadModalOpen: boolean;
  isNewRoomModalOpen: boolean;

  // Actions
  setActiveWorkspace: (ws: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveProject: (proj: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setActiveRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
  setActiveThread: (thread: Thread | null) => void;
  setThreads: (threads: Thread[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string, edited_at?: string) => void;
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (agentId: string, status: "online" | "offline" | "busy") => void;
  setConnected: (connected: boolean) => void;
  setTyping: (authorId: string, authorName: string) => void;
  clearTyping: (authorId: string) => void;

  // Modal actions
  setSettingsOpen: (open: boolean) => void;
  setAgentModalOpen: (open: boolean) => void;
  setSearchModalOpen: (open: boolean) => void;
  setNewThreadModalOpen: (open: boolean) => void;
  setNewRoomModalOpen: (open: boolean) => void;
}

export const useRelayStore = create<RelayState>((set) => ({
  activeWorkspace: null,
  workspaces: [],
  activeProject: null,
  projects: [],
  activeRoom: null,
  rooms: [],
  activeThread: null,
  threads: [],
  messages: [],
  agents: [],

  isConnected: false,
  typingMap: {},

  isSettingsOpen: false,
  isAgentModalOpen: false,
  isSearchModalOpen: false,
  isNewThreadModalOpen: false,
  isNewRoomModalOpen: false,

  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveProject: (proj) => set({ activeProject: proj }),
  setProjects: (projects) => set({ projects }),
  setActiveRoom: (room) => set({ activeRoom: room }),
  setRooms: (rooms) => set({ rooms }),
  setActiveThread: (thread) => set({ activeThread: thread }),
  setThreads: (threads) => set({ threads }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Check for duplicate by id
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    }),
  updateMessage: (id, content, edited_at) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content, edited_at } : m
      ),
    })),
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status } : a
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setTyping: (authorId, authorName) =>
    set((state) => ({
      typingMap: {
        ...state.typingMap,
        [authorId]: { author_name: authorName, timestamp: Date.now() },
      },
    })),
  clearTyping: (authorId) =>
    set((state) => {
      const next = { ...state.typingMap };
      delete next[authorId];
      return { typingMap: next };
    }),

  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setAgentModalOpen: (open) => set({ isAgentModalOpen: open }),
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),
  setNewThreadModalOpen: (open) => set({ isNewThreadModalOpen: open }),
  setNewRoomModalOpen: (open) => set({ isNewRoomModalOpen: open }),
}));
