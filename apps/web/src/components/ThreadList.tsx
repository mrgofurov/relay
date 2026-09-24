"use client";

import React, { useState } from "react";
import {
  Check,
  MessageSquare,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";
import { cn, formatTime } from "../lib/utils";

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
}

export function ThreadList({ onSelectThread }: ThreadListProps) {
  const {
    activeRoom,
    threads,
    setThreads,
    activeThread,
    setActiveThread,
    setSettingsOpen,
    setNewThreadModalOpen,
  } = useRelayStore();

  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filteredThreads = threads.filter((t) => {
    if (filter === "open") return t.status === "open";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  return (
    <section className="w-72 flex-shrink-0 bg-relay-surface border-r border-relay-border flex flex-col h-screen select-none text-xs">
      {/* Room Header */}
      <div className="h-12 px-3.5 border-b border-relay-subtle flex items-center justify-between">
        <div className="truncate pr-2">
          <span className="font-semibold text-xs text-relay-text truncate block">
            #{activeRoom?.name || "Select Room"}
          </span>
          <span className="text-[10px] text-relay-muted block truncate leading-tight">
            {activeRoom?.description || "Thread channel"}
          </span>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {activeRoom && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded hover:bg-relay-hover text-relay-muted hover:text-relay-text transition-colors"
              title="Room AI Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setNewThreadModalOpen(true)}
            disabled={!activeRoom}
            className="flex items-center gap-1 px-2 py-1 rounded bg-relay-text hover:opacity-90 disabled:opacity-40 text-[11px] text-relay-canvas font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-bar & Understated Segmented Filter */}
      <div className="px-3 py-1.5 bg-relay-elevated border-b border-relay-subtle flex items-center justify-between text-[11px]">
        <div className="text-[10px] text-relay-muted flex items-center gap-1.5">
          <span>Mode:</span>
          {activeRoom?.auto_discussion ? (
            <span className="text-relay-secondary font-mono">
              Auto ({activeRoom.max_reply_depth})
            </span>
          ) : (
            <span className="text-relay-muted">Manual</span>
          )}
        </div>

        {/* Minimal Text-Based Filter Tabs */}
        <div className="flex items-center gap-0.5 bg-relay-canvas p-0.5 rounded border border-relay-border">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "all"
                ? "bg-relay-surface text-relay-text font-medium shadow-sm"
                : "text-relay-muted hover:text-relay-secondary"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("open")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "open"
                ? "bg-relay-surface text-relay-text font-medium shadow-sm"
                : "text-relay-muted hover:text-relay-secondary"
            )}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "resolved"
                ? "bg-relay-surface text-relay-text font-medium shadow-sm"
                : "text-relay-muted hover:text-relay-secondary"
            )}
          >
            Done
          </button>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-relay-subtle">
        {!activeRoom ? (
          <div className="h-40 flex items-center justify-center text-xs text-relay-muted text-center px-4">
            Select a room to view threads
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-relay-muted text-center px-4">
            <p>No threads found</p>
            <button
              onClick={() => setNewThreadModalOpen(true)}
              className="mt-1.5 text-relay-text hover:underline text-xs"
            >
              Start a thread
            </button>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isSelected = activeThread?.id === thread.id;
            const isResolved = thread.status === "resolved";

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  "group px-3 py-2.5 cursor-pointer transition-colors text-left relative",
                  isSelected
                    ? "bg-relay-elevated border-l-2 border-relay-text pl-2.5"
                    : "hover:bg-relay-hover"
                )}
              >
                <div className="flex items-start justify-between gap-1.5 pr-5">
                  <h4
                    className={cn(
                      "text-xs line-clamp-1 leading-snug",
                      isSelected ? "font-medium text-relay-text" : "text-relay-secondary"
                    )}
                  >
                    {thread.title}
                  </h4>
                  {isResolved && (
                    <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-relay-muted">
                  <span className="truncate">{thread.author_name}</span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>{thread.message_count}</span>
                    </span>
                    <span>{formatTime(thread.updated_at)}</span>
                  </div>
                </div>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete thread "${thread.title}" and all its messages?`)) {
                      try {
                        await api.deleteThread(thread.id);
                        setThreads(threads.filter((t) => t.id !== thread.id));
                        if (activeThread?.id === thread.id) {
                          setActiveThread(null);
                        }
                      } catch (err: any) {
                        alert(`Failed to delete thread: ${err.message}`);
                      }
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-opacity"
                  title="Delete thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
