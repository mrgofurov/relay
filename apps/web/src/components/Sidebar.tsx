"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Hash,
  Lock,
  LogOut,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

interface SidebarProps {
  onSelectRoom: (roomId: string) => void;
}

export function Sidebar({ onSelectRoom }: SidebarProps) {
  const {
    activeWorkspace,
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

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0f0f12] border-r border-[#232326] flex flex-col h-screen select-none text-xs">
      {/* Workspace Header */}
      <div className="h-12 px-3.5 border-b border-[#1a1a1d] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-[#18181c] border border-[#27272a] flex items-center justify-center text-[#fafafa] font-semibold text-xs flex-shrink-0">
            {activeWorkspace?.name?.charAt(0) || "R"}
          </div>
          <div className="truncate">
            <span className="font-semibold text-xs text-[#fafafa] block truncate leading-tight">
              {activeWorkspace?.name || "Relay"}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-emerald-400" : "bg-neutral-600"
                )}
              />
              <span className="text-[10px] text-[#71717a] leading-none">
                {isConnected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Command / Search Trigger */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#141417] hover:bg-[#18181c] border border-[#232326] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">Search...</span>
          </span>
          <kbd className="px-1 py-0.2 text-[10px] rounded bg-[#18181b] border border-[#27272a] text-[#71717a]">
            ⌘K
          </kbd>
        </button>

        {/* Projects & Rooms Navigation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-medium tracking-wider text-[#71717a] uppercase">
            <span>Projects & Rooms</span>
            <button
              onClick={() => setNewRoomModalOpen(true)}
              className="p-0.5 text-[#71717a] hover:text-[#fafafa] transition-colors"
              title="Add Room"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-[#52525b]">No projects yet</div>
          ) : (
            projects.map((proj) => {
              const isExpanded = expandedProjects[proj.id] !== false;
              const projectRooms = rooms.filter((r) => r.project_id === proj.id);

              return (
                <div key={proj.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleProject(proj.id)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded-md hover:bg-[#151518] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-[#71717a]" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-[#71717a]" />
                      )}
                      <span className="truncate font-medium">{proj.name}</span>
                    </span>
                    <span className="text-[10px] text-[#52525b] font-mono">
                      {proj.key}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-2 pl-2 border-l border-[#1a1a1d] space-y-0.5 mt-0.5">
                      {projectRooms.map((room) => {
                        const isActive = activeRoom?.id === room.id;
                        const isGitEvents = room.slug === "git-events";

                        return (
                          <button
                            key={room.id}
                            onClick={() => onSelectRoom(room.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors text-left",
                              isActive
                                ? "bg-[#18181c] text-[#fafafa] font-medium"
                                : "text-[#71717a] hover:text-[#d4d4d8] hover:bg-[#141417]"
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {isGitEvents ? (
                                <FolderGit2 className="w-3.5 h-3.5 text-[#a1a1aa] flex-shrink-0" />
                              ) : room.is_private ? (
                                <Lock className="w-3.5 h-3.5 text-[#52525b] flex-shrink-0" />
                              ) : (
                                <Hash className="w-3.5 h-3.5 text-[#52525b] flex-shrink-0" />
                              )}
                              <span className="truncate">{room.name}</span>
                            </span>
                            {room.auto_discussion && (
                              <span
                                className="text-[9px] px-1 py-0.2 rounded bg-[#18181c] text-[#71717a] border border-[#27272a]"
                                title={`AI Auto Discussion (depth ${room.max_reply_depth})`}
                              >
                                {room.max_reply_depth}
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
        <div className="pt-2 border-t border-[#1a1a1d] space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-medium tracking-wider text-[#71717a] uppercase">
            <span>AI Agents</span>
            <button
              onClick={() => setAgentModalOpen(true)}
              className="p-0.5 text-[#71717a] hover:text-[#fafafa] transition-colors"
              title="Register Agent"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {agents.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-[#52525b]">
                No agents registered
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#151518] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        agent.status === "online"
                          ? "bg-emerald-400"
                          : agent.status === "busy"
                          ? "bg-amber-400"
                          : "bg-neutral-600"
                      )}
                    />
                    <span className="text-[#fafafa] font-medium truncate">
                      @{agent.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#71717a] capitalize flex-shrink-0 font-mono">
                    {agent.provider}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-2.5 border-t border-[#1a1a1d] bg-[#0c0c0e] flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-6 h-6 rounded-full bg-[#1c1c20] border border-[#27272a] flex items-center justify-center text-[10px] font-medium text-[#fafafa]">
            {activeWorkspace?.name?.charAt(0) || "U"}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-[#fafafa] block truncate leading-tight">
              Developer
            </span>
            <span className="text-[10px] text-[#71717a] block truncate leading-none">
              Active Node
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => alert("Relay v0.1.0 — Production Developer Platform")}
            className="p-1 rounded hover:bg-[#18181c] text-[#71717a] hover:text-[#fafafa] transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              api.clearToken();
              window.location.reload();
            }}
            className="p-1 rounded hover:bg-[#18181c] text-[#71717a] hover:text-[#fafafa] transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
