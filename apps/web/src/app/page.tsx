"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { ThreadList } from "../components/ThreadList";
import { ConversationView } from "../components/ConversationView";
import { RoomSettingsModal } from "../components/RoomSettingsModal";
import { AgentModal } from "../components/AgentModal";
import { SearchModal } from "../components/SearchModal";
import { NewThreadModal } from "../components/NewThreadModal";
import { NewRoomModal } from "../components/NewRoomModal";
import { useRelayStore } from "../stores/useRelayStore";
import { useWebSocket } from "../hooks/useWebSocket";
import { api } from "../lib/api";
import { Bot, Key, Lock, Mail, Moon, Sparkles, Sun, User } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("developer@example.com");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Lead Developer");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { isDark, toggleTheme } = useTheme();

  const {
    activeWorkspace,
    setActiveWorkspace,
    setWorkspaces,
    activeProject,
    setActiveProject,
    setProjects,
    activeRoom,
    setActiveRoom,
    setRooms,
    activeThread,
    setActiveThread,
    setThreads,
    setMessages,
    setAgents,
  } = useRelayStore();

  const { sendTyping } = useWebSocket();

  // Helper to extract readable error message
  const parseErrorMessage = (err: any): string => {
    try {
      const msg = err.message || "";
      if (msg.startsWith("{") && msg.endsWith("}")) {
        const parsed = JSON.parse(msg);
        if (typeof parsed.detail === "string") return parsed.detail;
        if (Array.isArray(parsed.detail)) return parsed.detail.map((d: any) => d.msg).join(", ");
      }
      return msg;
    } catch {
      return err.message || "An error occurred";
    }
  };

  // Check initial authentication
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
      loadWorkspaceData();
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const loadWorkspaceData = async () => {
    try {
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0) {
        const ws = wsList[0];
        setActiveWorkspace(ws);

        // Load projects, auto-provision if empty
        let projs = await api.getProjects(ws.id);
        if (projs.length === 0) {
          try {
            const defProj = await api.createProject(ws.id, "Relay Core", "RELAY", "Default engineering workspace");
            await api.createRoom(defProj.id, "general", "general", "Team discussion");
            await api.createRoom(defProj.id, "engineering", "engineering", "Architecture and development");
            await api.createRoom(defProj.id, "git-events", "git-events", "Automated commit and PR events");
            projs = await api.getProjects(ws.id);
          } catch (err) {
            console.error("Auto-provision error:", err);
          }
        }
        setProjects(projs);

        // Load agents, auto-provision default team agents if empty
        let ags = await api.getAgents(ws.id);
        if (ags.length === 0) {
          try {
            await api.registerAgent(ws.id, "claude-code", "claude", "claude-3-5-sonnet");
            await api.registerAgent(ws.id, "gemini-cli", "gemini", "gemini-1.5-pro");
            ags = await api.getAgents(ws.id);
          } catch (err) {
            console.error("Agent seed error:", err);
          }
        }
        setAgents(ags);

        if (projs.length > 0) {
          const proj = projs[0];
          setActiveProject(proj);

          // Load rooms
          const rms = await api.getRooms(proj.id);
          setRooms(rms);

          if (rms.length > 0) {
            const rm = rms[0];
            setActiveRoom(rm);
            loadThreads(rm.id);
          }
        }
      }
    } catch (e) {
      console.error("Error loading workspace data:", e);
    }
  };

  const loadThreads = async (roomId: string) => {
    try {
      const ths = await api.getThreads(roomId);
      setThreads(ths);
      if (ths.length > 0) {
        setActiveThread(ths[0]);
        loadMessages(ths[0].id);
      } else {
        setActiveThread(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Error loading threads:", e);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const msgs = await api.getMessages(threadId);
      setMessages(msgs);
    } catch (e) {
      console.error("Error loading messages:", e);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    const rm = useRelayStore.getState().rooms.find((r) => r.id === roomId);
    if (rm) {
      setActiveRoom(rm);
      loadThreads(rm.id);
    }
  };

  const handleSelectThread = (threadId: string) => {
    const th = useRelayStore.getState().threads.find((t) => t.id === threadId);
    if (th) {
      setActiveThread(th);
      loadMessages(th.id);
    }
  };

  const handleSendMessage = async (content: string, mentions: string[]) => {
    if (!activeThread) return;
    await api.sendMessage(activeThread.id, content, "human", undefined, undefined, mentions);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isRegistering) {
        await api.register(email, password, fullName);
      }
      await api.login(email, password);
      setIsAuthenticated(true);
      await loadWorkspaceData();
    } catch (err: any) {
      setAuthError(parseErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo auto-login helper
  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      // Try registering demo user or logging in
      try {
        await api.register("engineer@example.com", "password123", "Demo Engineer");
      } catch {
        // already exists, proceed to login
      }
      await api.login("engineer@example.com", "password123");
      setIsAuthenticated(true);
      await loadWorkspaceData();
    } catch (e: any) {
      setAuthError(parseErrorMessage(e));
    } finally {
      setAuthLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-relay-canvas flex items-center justify-center text-xs text-relay-muted">
        Loading Relay...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-relay-canvas flex flex-col items-center justify-center p-4 relative selection:bg-relay-active">
        {/* Top-right theme toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md bg-relay-surface border border-relay-border text-relay-muted hover:text-relay-text hover:bg-relay-hover transition-colors shadow-sm flex items-center gap-1.5 text-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-medium">{isDark ? "Light" : "Dark"}</span>
          </button>
        </div>

        <div className="w-full max-w-[380px] bg-relay-surface border border-relay-border rounded-xl p-7 space-y-6 shadow-xl">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-8 h-8 rounded-md bg-relay-elevated border border-relay-border mx-auto flex items-center justify-center text-relay-text font-medium text-xs tracking-wider">
              R
            </div>
            <div>
              <h1 className="text-base font-semibold text-relay-text tracking-tight">
                {isRegistering ? "Create your workspace" : "Welcome back"}
              </h1>
              <p className="text-xs text-relay-muted mt-0.5">
                {isRegistering
                  ? "Start collaborating with AI agents and developers"
                  : "Sign in to continue to Relay"}
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-relay-secondary font-medium block">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-secondary transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-relay-secondary font-medium block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-secondary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-relay-secondary font-medium block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-secondary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-2 rounded-md bg-relay-text hover:opacity-90 text-relay-canvas font-medium text-xs transition-colors disabled:opacity-50 shadow-sm"
            >
              {authLoading
                ? "Signing in..."
                : isRegistering
                ? "Create Account"
                : "Continue"}
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={authLoading}
              className="w-full py-2 rounded-md bg-relay-elevated hover:bg-relay-hover border border-relay-border text-relay-secondary hover:text-relay-text font-medium text-xs transition-colors"
            >
              Demo Workspace Login
            </button>
          </form>

          <div className="text-center text-xs text-relay-muted pt-1 border-t border-relay-subtle">
            {isRegistering ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-relay-text hover:underline font-medium"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-relay-text hover:underline font-medium"
                >
                  Create account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-relay-canvas text-relay-text">
      {/* Column 1: Projects & Rooms Navigation */}
      <Sidebar onSelectRoom={handleSelectRoom} />

      {/* Column 2: Thread List for Active Room */}
      <ThreadList onSelectThread={handleSelectThread} />

      {/* Column 3: Active Thread Conversation & Agent Activity */}
      <ConversationView
        onSendMessage={handleSendMessage}
        onTyping={sendTyping}
      />

      {/* Modals */}
      <RoomSettingsModal />
      <AgentModal />
      <SearchModal />
      <NewThreadModal />
      <NewRoomModal />
    </div>
  );
}
