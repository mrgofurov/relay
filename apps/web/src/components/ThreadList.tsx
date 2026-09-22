"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { cn, formatDate, formatTime } from "../lib/utils";

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
    <section className="w-80 flex-shrink-0 bg-[#11141f] border-r border-[#1a2030] flex flex-col h-screen select-none">
      {/* Room Header */}
      <div className="h-14 px-4 border-b border-[#1a2030] flex items-center justify-between">
        <div className="truncate">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-slate-100 truncate">
              #{activeRoom?.name || "Select Room"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {activeRoom?.description || "Thread-first channel"}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {activeRoom && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-md hover:bg-[#1a2030] text-slate-400 hover:text-slate-200 transition-colors"
              title="Room AI Discussion Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setNewThreadModalOpen(true)}
            disabled={!activeRoom}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white font-medium shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Thread</span>
          </button>
        </div>
      </div>

      {/* Discussion Mode Banner & Filters */}
      <div className="px-3 py-2 bg-[#0e111a] border-b border-[#1a2030] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Discussion:</span>
          {activeRoom?.auto_discussion ? (
            <span className="text-indigo-300 font-medium bg-indigo-950/70 border border-indigo-800/40 px-1.5 py-0.2 rounded">
              Auto (max {activeRoom.max_reply_depth})
            </span>
          ) : (
            <span className="text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
              Manual
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-[#151926] p-0.5 rounded border border-[#21283c]">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded transition-colors",
              filter === "all" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("open")}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded transition-colors",
              filter === "open" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            )}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded transition-colors",
              filter === "resolved" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            )}
          >
            Done
          </button>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#181d2c] p-2 space-y-1.5">
        {!activeRoom ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
            Select a room from the left sidebar to view threads.
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-500 text-center px-4">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
            <p>No threads in this room yet.</p>
            <button
              onClick={() => setNewThreadModalOpen(true)}
              className="mt-2 text-indigo-400 hover:underline text-xs"
            >
              Start the first thread
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
                  "p-3 rounded-lg cursor-pointer transition-all border",
                  isSelected
                    ? "bg-[#181d2c] border-indigo-500/40 shadow-sm"
                    : "bg-[#131722]/60 hover:bg-[#161a27] border-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-2">
                    {thread.title}
                  </h4>
                  {isResolved && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-medium text-slate-300">
                      {thread.author_name.charAt(0)}
                    </span>
                    <span className="truncate">{thread.author_name}</span>
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span>{thread.message_count}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatTime(thread.updated_at)}
                    </span>
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
