"use client";

import React from "react";
import {
  Bot,
  CheckCircle,
  Copy,
  GitCommit,
  GitPullRequest,
  Layers,
  Sparkles,
  Terminal,
  User,
} from "lucide-react";
import { Message } from "../types";
import { cn, formatTime } from "../lib/utils";

interface MessageItemProps {
  message: Message;
  maxDepth?: number;
}

export function MessageItem({ message, maxDepth = 3 }: MessageItemProps) {
  const isAgent = message.author_type === "agent";
  const isGit = message.author_type === "git";
  const isSystem = message.author_type === "system";

  const getProviderBadge = () => {
    switch (message.provider) {
      case "gemini":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/50 flex items-center gap-1 font-medium">
            <Sparkles className="w-2.5 h-2.5 text-sky-400" />
            Gemini
          </span>
        );
      case "claude":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 flex items-center gap-1 font-medium">
            <Bot className="w-2.5 h-2.5 text-amber-400" />
            Claude
          </span>
        );
      case "openai":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 font-medium">
            <Bot className="w-2.5 h-2.5 text-emerald-400" />
            OpenAI
          </span>
        );
      case "cursor":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/50 flex items-center gap-1 font-medium">
            <Terminal className="w-2.5 h-2.5 text-purple-400" />
            Cursor
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 flex items-center gap-1 font-medium">
            <Bot className="w-2.5 h-2.5 text-indigo-400" />
            Agent
          </span>
        );
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 rounded-full bg-[#181d2c] border border-[#242b3e] text-[11px] text-slate-400">
          {message.content}
        </span>
      </div>
    );
  }

  if (isGit) {
    const meta = message.metadata_payload || {};
    return (
      <div className="my-2 p-3.5 rounded-lg bg-[#141926] border border-amber-500/20 shadow-sm max-w-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#21283c]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-950/60 border border-amber-700/50 flex items-center justify-center text-amber-400">
              <GitCommit className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-200">
              Git Activity: {meta.repo || "Repository"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">{formatTime(message.created_at)}</span>
        </div>

        <div className="mt-2.5 text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Highlight @mentions in content
  const formatContent = (text: string) => {
    const parts = text.split(/(@[\w-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg transition-colors",
        isAgent
          ? "bg-[#131724]/70 border border-[#21283c]/60 hover:border-indigo-500/30"
          : "hover:bg-[#131622]/40"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm",
          isAgent
            ? "bg-gradient-to-br from-indigo-900 to-slate-900 text-indigo-300 border border-indigo-700/40"
            : "bg-slate-800 text-slate-300 border border-slate-700"
        )}
      >
        {isAgent ? <Bot className="w-4 h-4" /> : message.author_name.charAt(0).toUpperCase()}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-semibold text-slate-200">
            {message.author_name}
          </span>
          {isAgent && getProviderBadge()}
          {isAgent && message.model && (
            <span className="text-[10px] text-slate-400 font-mono">
              ({message.model})
            </span>
          )}
          {isAgent && message.reply_depth > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
              Depth: {message.reply_depth}/{maxDepth}
            </span>
          )}
          <span className="text-[10px] text-slate-400 ml-auto">
            {formatTime(message.created_at)}
          </span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {formatContent(message.content)}
        </div>
      </div>
    </div>
  );
}
