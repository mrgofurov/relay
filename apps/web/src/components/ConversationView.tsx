"use client";

import React, { useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";
import { ComposeBar } from "./ComposeBar";
import { MessageItem } from "./MessageItem";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";

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
    setNewThreadModalOpen,
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

  const typingList = Object.values(typingMap).map((t) => t.author_name);

  if (!activeThread) {
    return (
      <main className="flex-1 bg-[#09090b] flex flex-col items-center justify-center text-center p-8 text-xs select-none">
        <div className="max-w-sm space-y-3">
          <h3 className="text-sm font-semibold text-[#fafafa]">
            No thread selected
          </h3>
          <p className="text-xs text-[#71717a] leading-relaxed">
            Select a thread from the list to view the discussion, or start a new thread to collaborate with team members and AI agents.
          </p>
          <button
            onClick={() => setNewThreadModalOpen(true)}
            disabled={!activeRoom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-[#09090b] text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New thread</span>
          </button>
        </div>
      </main>
    );
  }

  const isResolved = activeThread.status === "resolved";

  return (
    <main className="flex-1 bg-[#09090b] flex flex-col h-screen overflow-hidden text-xs">
      {/* Thread Header */}
      <header className="h-12 px-5 border-b border-[#232326] bg-[#09090b] flex items-center justify-between z-10 flex-shrink-0">
        <div className="truncate flex-1 mr-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#fafafa] truncate">
              {activeThread.title}
            </h2>
            {isResolved && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131d16] text-[#4ade80] border border-[#1b3824] flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#71717a] mt-0.5">
            <span>By <strong className="text-[#a1a1aa] font-medium">{activeThread.author_name}</strong></span>
            <span>•</span>
            <span>{formatDate(activeThread.created_at)}</span>
            <span>•</span>
            <span className="text-[#a1a1aa]">#{activeRoom?.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {!isResolved && (
            <button
              onClick={handleResolveThread}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151518] hover:bg-[#1c1c20] border border-[#27272a] text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors font-medium"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Timeline — Natural Stream */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-[#52525b]">
            No messages in this thread yet. Send a message to start collaborating.
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

        {/* Realtime typing indicators */}
        {typingList.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#71717a] px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-pulse" />
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
