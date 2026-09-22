"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Hash,
  Lock,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { useTheme } from "../hooks/useTheme";
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

  const { isDark, toggleTheme } = useTheme();

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
    <aside className="w-60 flex-shrink-0 bg-relay-surface border-r border-relay-border flex flex-col h-screen select-none text-xs">
      {/* Workspace Header */}
      <div className="h-12 px-3.5 border-b border-relay-subtle flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-relay-elevated border border-relay-border flex items-center justify-center text-relay-text font-semibold text-xs flex-shrink-0">
            {activeWorkspace?.name?.charAt(0) || "R"}
          </div>
          <div className="truncate">
            <span className="font-semibold text-xs text-relay-text block truncate leading-tight">
              {activeWorkspace?.name || "Relay"}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-emerald-500" : "bg-neutral-400"
                )}
              />
              <span className="text-[10px] text-relay-muted leading-none">
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
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-relay-canvas hover:bg-relay-elevated border border-relay-border text-relay-muted hover:text-relay-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">Search...</span>
          </span>
          <kbd className="px-1 py-0.2 text-[10px] rounded bg-relay-elevated border border-relay-border text-relay-muted">
            ⌘K
          </kbd>
        </button>

        {/* Projects & Rooms Navigation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-medium tracking-wider text-relay-muted uppercase">
            <span>Projects & Rooms</span>
            <button
              onClick={() => setNewRoomModalOpen(true)}
              className="p-0.5 text-relay-muted hover:text-relay-text transition-colors"
              title="Add Room"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-relay-muted">No projects yet</div>
          ) : (
            projects.map((proj) => {
              const isExpanded = expandedProjects[proj.id] !== false;
              const projectRooms = rooms.filter((r) => r.project_id === proj.id);

              return (
                <div key={proj.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleProject(proj.id)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded-md hover:bg-relay-hover text-relay-secondary hover:text-relay-text transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-relay-muted" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-relay-muted" />
                      )}
                      <span className="truncate font-medium">{proj.name}</span>
                    </span>
                    <span className="text-[10px] text-relay-muted font-mono">
                      {proj.key}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-2 pl-2 border-l border-relay-subtle space-y-0.5 mt-0.5">
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
                                ? "bg-relay-elevated text-relay-text font-medium"
                                : "text-relay-muted hover:text-relay-secondary hover:bg-relay-hover"
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {isGitEvents ? (
                                <FolderGit2 className="w-3.5 h-3.5 text-relay-secondary flex-shrink-0" />
                              ) : room.is_private ? (
                                <Lock className="w-3.5 h-3.5 text-relay-muted flex-shrink-0" />
                              ) : (
                                <Hash className="w-3.5 h-3.5 text-relay-muted flex-shrink-0" />
                              )}
                              <span className="truncate">{room.name}</span>
                            </span>
                            {room.auto_discussion && (
                              <span
                                className="text-[9px] px-1 py-0.2 rounded bg-relay-canvas text-relay-muted border border-relay-border"
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
        <div className="pt-2 border-t border-relay-subtle space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-medium tracking-wider text-relay-muted uppercase">
            <span>AI Agents</span>
            <button
              onClick={() => setAgentModalOpen(true)}
              className="p-0.5 text-relay-muted hover:text-relay-text transition-colors"
              title="Register Agent"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {agents.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-relay-muted">
                No agents registered
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-relay-hover transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        agent.status === "online"
                          ? "bg-emerald-500"
                          : agent.status === "busy"
                          ? "bg-amber-400"
                          : "bg-neutral-400"
                      )}
                    />
                    <span className="text-relay-text font-medium truncate">
                      @{agent.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-relay-muted capitalize flex-shrink-0 font-mono">
                    {agent.provider}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Footer Profile & Theme Switcher */}
      <div className="p-2.5 border-t border-relay-subtle bg-relay-surface flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-6 h-6 rounded-full bg-relay-elevated border border-relay-border flex items-center justify-center text-[10px] font-medium text-relay-text">
            {activeWorkspace?.name?.charAt(0) || "U"}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-relay-text block truncate leading-tight">
              Developer
            </span>
            <span className="text-[10px] text-relay-muted block truncate leading-none">
              Active Node
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleTheme}
            className="p-1 rounded hover:bg-relay-hover text-relay-muted hover:text-relay-text transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => alert("Relay v0.1.0 — Production Developer Platform")}
            className="p-1 rounded hover:bg-relay-hover text-relay-muted hover:text-relay-text transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              api.clearToken();
              window.location.reload();
            }}
            className="p-1 rounded hover:bg-relay-hover text-relay-muted hover:text-relay-text transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
