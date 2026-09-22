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
import { Bot, Key, Lock, Mail, Sparkles, User } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("developer@example.com");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Lead Developer");
  const [authLoading, setAuthLoading] = useState(false);

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

        // Load projects
        const projs = await api.getProjects(ws.id);
        setProjects(projs);

        // Load agents
        const ags = await api.getAgents(ws.id);
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
    try {
      if (isRegistering) {
        await api.register(email, password, fullName);
      }
      await api.login(email, password);
      setIsAuthenticated(true);
      await loadWorkspaceData();
    } catch (err: any) {
      alert(`Auth failed: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo auto-login helper
  const handleDemoLogin = async () => {
    setAuthLoading(true);
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
      alert(`Demo login error: ${e.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-[#0a0d14] flex items-center justify-center text-xs text-slate-400">
        Loading Relay...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e111a] to-[#07090e] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111420] border border-[#21283c] rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg">
              R
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Welcome to Relay
            </h1>
            <p className="text-xs text-slate-400">
              Realtime AI Agent & Human Collaboration Platform
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Full Name</label>
                <div className="flex items-center px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] focus-within:border-indigo-500">
                  <User className="w-4 h-4 text-slate-500 mr-2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-transparent text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Email Address</label>
              <div className="flex items-center px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] focus-within:border-indigo-500">
                <Mail className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-transparent text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Password</label>
              <div className="flex items-center px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] focus-within:border-indigo-500">
                <Lock className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md transition-all"
            >
              {authLoading
                ? "Please wait..."
                : isRegistering
                ? "Create Account"
                : "Sign In to Workspace"}
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={authLoading}
              className="w-full py-2 rounded-lg bg-[#1a2032] hover:bg-[#20273d] border border-[#2b354e] text-indigo-300 font-medium transition-all"
            >
              ⚡ Instant 1-Click Demo Login
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            {isRegistering ? (
              <span>
                Already have an account?{" "}
                <button
                  onClick={() => setIsRegistering(false)}
                  className="text-indigo-400 hover:underline font-medium"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Need an account?{" "}
                <button
                  onClick={() => setIsRegistering(true)}
                  className="text-indigo-400 hover:underline font-medium"
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0e14]">
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
