"use client";

import React, { useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Hash,
  Lock,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { cn } from "../lib/utils";

interface SidebarProps {
  onSelectRoom: (roomId: string) => void;
}

export function Sidebar({ onSelectRoom }: SidebarProps) {
  const {
    activeWorkspace,
    workspaces,
    projects,
    rooms,
    activeRoom,
    agents,
    isConnected,
    setSearchModalOpen,
    setAgentModalOpen,
    setNewRoomModalOpen,
  } = useRelayStore();

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    all: true,
  });

  const toggleProject = (projId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "gemini":
        return "text-sky-400 bg-sky-950/50 border-sky-800/60";
      case "claude":
        return "text-amber-400 bg-amber-950/50 border-amber-800/60";
      case "openai":
        return "text-emerald-400 bg-emerald-950/50 border-emerald-800/60";
      case "cursor":
        return "text-purple-400 bg-purple-950/50 border-purple-800/60";
      default:
        return "text-indigo-400 bg-indigo-950/50 border-indigo-800/60";
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0e111a] border-r border-[#1a2030] flex flex-col h-screen select-none">
      {/* Workspace Header */}
      <div className="h-14 px-4 border-b border-[#1a2030] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {activeWorkspace?.name?.charAt(0) || "R"}
          </div>
          <div className="truncate">
            <span className="font-semibold text-sm text-slate-100 block truncate">
              {activeWorkspace?.name || "Relay Workspace"}
            </span>
            <div className="flex items-center space-x-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                )}
              />
              <span className="text-[11px] text-slate-400">
                {isConnected ? "Realtime Online" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setSearchModalOpen(true)}
          className="p-1.5 rounded-md hover:bg-[#1a2030] text-slate-400 hover:text-slate-200 transition-colors"
          title="Search (Cmd+K)"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Projects & Rooms Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Quick action search bar */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-[#141824] hover:bg-[#191f2e] border border-[#21283c] text-xs text-slate-400 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Search anything...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#0e111a] border border-[#262f46] text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Projects tree */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <span>Projects & Rooms</span>
            <button
              onClick={() => setNewRoomModalOpen(true)}
              className="p-0.5 hover:text-indigo-400 transition-colors"
              title="Add Room"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No projects yet</div>
          ) : (
            projects.map((proj) => {
              const isExpanded = expandedProjects[proj.id] !== false;
              const projectRooms = rooms.filter((r) => r.project_id === proj.id);

              return (
                <div key={proj.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleProject(proj.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#151926] text-xs text-slate-300 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="truncate">{proj.name}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c2233] text-slate-400">
                      {proj.key}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 pl-2 border-l border-[#1a2030] space-y-0.5">
                      {projectRooms.map((room) => {
                        const isActive = activeRoom?.id === room.id;
                        const isGitEvents = room.slug === "git-events";

                        return (
                          <button
                            key={room.id}
                            onClick={() => onSelectRoom(room.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all",
                              isActive
                                ? "bg-indigo-600/15 text-indigo-300 font-medium border border-indigo-500/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-[#151926]"
                            )}
                          >
                            <span className="flex items-center gap-2 truncate">
                              {isGitEvents ? (
                                <FolderGit2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              ) : room.is_private ? (
                                <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              ) : (
                                <Hash className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{room.name}</span>
                            </span>
                            {room.auto_discussion && (
                              <span
                                className="text-[9px] px-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40"
                                title={`AI Auto Discussion active (max depth ${room.max_reply_depth})`}
                              >
                                AI:{room.max_reply_depth}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* AI Agents Section */}
        <div className="pt-2 border-t border-[#1a2030] space-y-1.5">
          <div className="flex items-center justify-between px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Agents</span>
            </span>
            <button
              onClick={() => setAgentModalOpen(true)}
              className="p-0.5 hover:text-indigo-400 transition-colors"
              title="Register Agent"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {agents.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-500 italic">
                No agents registered yet. Click + to add.
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#151926] text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        agent.status === "online"
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : agent.status === "busy"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-slate-600"
                      )}
                    />
                    <span className="text-slate-300 font-medium truncate">
                      @{agent.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border capitalize",
                      getProviderColor(agent.provider)
                    )}
                  >
                    {agent.provider}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#1a2030] bg-[#0b0e16] flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-200">
            Dev
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-slate-200 block truncate">Developer</span>
            <span className="text-[10px] text-slate-500 block truncate">Self-Hosted Node</span>
          </div>
        </div>
        <button
          onClick={() => alert("Relay v0.1.0 — Production Self-Hosted Platform")}
          className="p-1.5 rounded-md hover:bg-[#1a2030] text-slate-400 hover:text-slate-200"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
