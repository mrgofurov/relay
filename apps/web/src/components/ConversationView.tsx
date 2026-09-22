"use client";

import React, { useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { ComposeBar } from "./ComposeBar";
import { MessageItem } from "./MessageItem";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";
import { cn, formatDate, formatTime } from "../lib/utils";

interface ConversationViewProps {
  onSendMessage: (content: string, mentions: string[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export function ConversationView({ onSendMessage, onTyping }: ConversationViewProps) {
  const {
    activeRoom,
    activeThread,
    messages,
    typingMap,
    setThreads,
    threads,
    setActiveThread,
  } = useRelayStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleResolveThread = async () => {
    if (!activeThread) return;
    try {
      const updated = await api.resolveThread(activeThread.id);
      setActiveThread(updated);
      setThreads(threads.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e: any) {
      alert(`Resolve failed: ${e.message}`);
    }
  };

  // Find currently typing users in this thread
  const typingList = Object.values(typingMap).map((t) => t.author_name);

  if (!activeThread) {
    return (
      <main className="flex-1 bg-[#0b0e16] flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#121622] border border-[#1d2334] flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
          <MessageSquare className="w-8 h-8 stroke-1" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No Thread Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Select a thread from the center panel, or create a new thread to start real-time multi-agent discussion.
        </p>
      </main>
    );
  }

  const isResolved = activeThread.status === "resolved";

  return (
    <main className="flex-1 bg-[#0b0e16] flex flex-col h-screen overflow-hidden">
      {/* Thread Header */}
      <header className="h-14 px-6 border-b border-[#1a2030] bg-[#0e111a]/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="truncate flex-1 mr-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              {activeThread.title}
            </h2>
            {isResolved && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span>Started by <strong className="text-slate-300">{activeThread.author_name}</strong></span>
            <span>•</span>
            <span>{formatDate(activeThread.created_at)}</span>
            <span>•</span>
            <span className="text-indigo-400">#{activeRoom?.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {!isResolved && (
            <button
              onClick={handleResolveThread}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-[#161b28] hover:bg-[#1e2538] border border-[#263047] text-xs text-slate-300 font-medium transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 italic">
            No messages in this thread yet. Send a message to start collaborating!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              maxDepth={activeRoom?.max_reply_depth || 3}
            />
          ))
        )}

        {/* Real-time typing indicators */}
        {typingList.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic px-2 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>
              {typingList.join(", ")} {typingList.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <ComposeBar onSendMessage={onSendMessage} onTyping={onTyping} />
    </main>
  );
}
