"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
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
    setAgentModalOpen,
    agents,
  } = useRelayStore();

  const [quotePayload, setQuotePayload] = useState<string | null>(null);
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

  const handleQuote = (author: string, content: string) => {
    const snippet = content.length > 150 ? content.slice(0, 150) + "..." : content;
    setQuotePayload(`> @${author}: ${snippet}\n\n`);
  };

  const typingList = Object.values(typingMap).map((t) => t.author_name);

  if (!activeThread) {
    return (
      <main className="flex-1 bg-[#09090b] flex flex-col items-center justify-center text-center p-8 select-none">
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Select or start a discussion thread
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Collaborate in real time with human developers and autonomous AI coding agents
            (Claude Code, Gemini CLI, Cursor). Choose a thread from the left or create a new one.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setNewThreadModalOpen(true)}
              disabled={!activeRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Thread</span>
            </button>
            <button
              onClick={() => setAgentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-all"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Connect Agent</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isResolved = activeThread.status === "resolved";

  return (
    <main className="flex-1 bg-[#09090b] flex flex-col h-screen overflow-hidden text-xs">
      {/* Thread & Room Header */}
      <header className="px-5 py-2.5 border-b border-zinc-800 bg-[#0c0d11] flex items-center justify-between z-10 flex-shrink-0">
        <div className="truncate flex-1 mr-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100 truncate">
              {activeThread.title}
            </h2>
            {isResolved ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Resolved
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 font-medium">
                <Radio className="w-2.5 h-2.5 animate-pulse text-indigo-400" />
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 flex-wrap">
            <span>Started by <strong className="text-zinc-200 font-medium">{activeThread.author_name}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              {formatDate(activeThread.created_at)}
            </span>
            <span>•</span>
            <span className="text-indigo-400 font-medium">#{activeRoom?.name}</span>

            {/* Room Guardrails Pills */}
            {activeRoom && (
              <>
                <span>•</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono"
                  title="Guardrail: Loop prevention"
                >
                  loop-depth: {activeRoom.max_reply_depth || 3}
                </span>
                {activeRoom.auto_discussion && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
                    title="AI Auto-Discussion enabled"
                  >
                    auto-reply: on
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side actions & Active Agents count */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Active Agents Pills */}
          <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] text-zinc-400 font-medium">Agents:</span>
            {agents.length === 0 ? (
              <button
                onClick={() => setAgentModalOpen(true)}
                className="text-[10px] text-indigo-400 hover:underline"
              >
                + Connect
              </button>
            ) : (
              agents.slice(0, 4).map((ag) => (
                <span
                  key={ag.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-mono border border-zinc-700/80"
                  title={`${ag.name} (${ag.provider})`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      ag.status === "online" ? "bg-emerald-400" : "bg-zinc-500"
                    }`}
                  />
                  @{ag.name}
                </span>
              ))
            )}
          </div>

          {!isResolved && (
            <button
              onClick={handleResolveThread}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 transition-colors font-medium shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resolve</span>
            </button>
          )}

          <button
            onClick={async () => {
              if (confirm(`Delete thread "${activeThread.title}" and all its messages?`)) {
                try {
                  await api.deleteThread(activeThread.id);
                  setThreads(threads.filter((t) => t.id !== activeThread.id));
                  setActiveThread(null);
                } catch (err: any) {
                  alert(`Failed to delete thread: ${err.message}`);
                }
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors text-xs font-medium"
            title="Delete this thread"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </header>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs font-medium text-zinc-200">
              Discussion thread started
            </div>
            <p className="text-xs text-zinc-400 max-w-sm">
              Ask questions, discuss architecture, or mention AI agents like{" "}
              <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                @claude-code
              </code>{" "}
              yoki{" "}
              <code className="text-blue-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                @gemini-cli
              </code>{" "}
              to review or write code.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              maxDepth={activeRoom?.max_reply_depth || 3}
              onQuote={handleQuote}
            />
          ))
        )}

        {/* Realtime typing indicators */}
        {typingList.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 px-3 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg animate-pulse w-fit my-2">
            <Bot className="w-3.5 h-3.5" />
            <span>
              {typingList.join(", ")} {typingList.length === 1 ? "is" : "are"} thinking & typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <ComposeBar
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        initialContent={quotePayload}
        onClearInitialContent={() => setQuotePayload(null)}
      />
    </main>
  );
}
