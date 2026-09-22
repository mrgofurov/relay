"use client";

import React, { useState } from "react";
import {
  Check,
  MessageSquare,
  Plus,
  Settings2,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { cn, formatTime } from "../lib/utils";

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
}

export function ThreadList({ onSelectThread }: ThreadListProps) {
  const {
    activeRoom,
    threads,
    activeThread,
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
    <section className="w-72 flex-shrink-0 bg-[#0c0c0e] border-r border-[#232326] flex flex-col h-screen select-none text-xs">
      {/* Room Header */}
      <div className="h-12 px-3.5 border-b border-[#1a1a1d] flex items-center justify-between">
        <div className="truncate pr-2">
          <span className="font-semibold text-xs text-[#fafafa] truncate block">
            #{activeRoom?.name || "Select Room"}
          </span>
          <span className="text-[10px] text-[#71717a] block truncate leading-tight">
            {activeRoom?.description || "Thread channel"}
          </span>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {activeRoom && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded hover:bg-[#18181c] text-[#71717a] hover:text-[#fafafa] transition-colors"
              title="Room AI Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setNewThreadModalOpen(true)}
            disabled={!activeRoom}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#fafafa] hover:bg-white disabled:opacity-40 text-[11px] text-[#09090b] font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-bar & Understated Segmented Filter */}
      <div className="px-3 py-1.5 bg-[#0e0e11] border-b border-[#1a1a1d] flex items-center justify-between text-[11px]">
        <div className="text-[10px] text-[#71717a] flex items-center gap-1.5">
          <span>Mode:</span>
          {activeRoom?.auto_discussion ? (
            <span className="text-[#a1a1aa] font-mono">
              Auto ({activeRoom.max_reply_depth})
            </span>
          ) : (
            <span className="text-[#71717a]">Manual</span>
          )}
        </div>

        {/* Minimal Text-Based Filter Tabs */}
        <div className="flex items-center gap-0.5 bg-[#141417] p-0.5 rounded border border-[#232326]">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "all"
                ? "bg-[#1c1c20] text-[#fafafa] font-medium"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("open")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "open"
                ? "bg-[#1c1c20] text-[#fafafa] font-medium"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            )}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={cn(
              "px-1.5 py-0.5 text-[10px] rounded transition-colors",
              filter === "resolved"
                ? "bg-[#1c1c20] text-[#fafafa] font-medium"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            )}
          >
            Done
          </button>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1a1a1d]">
        {!activeRoom ? (
          <div className="h-40 flex items-center justify-center text-xs text-[#52525b] text-center px-4">
            Select a room to view threads
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-[#52525b] text-center px-4">
            <p>No threads found</p>
            <button
              onClick={() => setNewThreadModalOpen(true)}
              className="mt-1.5 text-[#fafafa] hover:underline text-xs"
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
                  "px-3 py-2.5 cursor-pointer transition-colors text-left",
                  isSelected
                    ? "bg-[#18181c] border-l-2 border-white pl-2.5"
                    : "hover:bg-[#141417]"
                )}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <h4
                    className={cn(
                      "text-xs line-clamp-1 leading-snug",
                      isSelected ? "font-medium text-[#fafafa]" : "text-[#d4d4d8]"
                    )}
                  >
                    {thread.title}
                  </h4>
                  {isResolved && (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#71717a]">
                  <span className="truncate">{thread.author_name}</span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>{thread.message_count}</span>
                    </span>
                    <span>{formatTime(thread.updated_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
