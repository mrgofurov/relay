"use client";

import React, { useState } from "react";
import {
  Bot,
  Check,
  Copy,
  GitCommit,
  Quote,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { Message } from "../types";
import { formatTime } from "../lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageItemProps {
  message: Message;
  maxDepth?: number;
  onQuote?: (author: string, content: string) => void;
}

export function MessageItem({ message, maxDepth = 3, onQuote }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isAgent = message.author_type === "agent";
  const isGit = message.author_type === "git";
  const isSystem = message.author_type === "system";

  // System events
  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-relay-surface border border-relay-border/80 text-[11px] text-relay-muted shadow-sm">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  // Git webhook commits / events
  if (isGit) {
    const meta = message.metadata_payload || {};
    return (
      <div className="my-2.5 p-3.5 rounded-lg bg-[#0e1117] border border-zinc-800 max-w-2xl text-xs shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px]">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="p-1 rounded bg-zinc-800/80 text-emerald-400">
              <GitCommit className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-zinc-100">
              {meta.repo || "Git Commit"}
            </span>
            {meta.branch && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                {meta.branch}
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">{formatTime(message.created_at)}</span>
        </div>

        <div className="mt-2.5 text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed pl-1">
          {message.content}
        </div>
      </div>
    );
  }

  // Helper for provider styling & icons
  const getProviderConfig = (provider?: string) => {
    switch (provider?.toLowerCase()) {
      case "claude":
        return {
          label: "Claude Code",
          badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
          avatarBg: "bg-gradient-to-br from-amber-600 to-orange-700 text-white",
          icon: <Sparkles className="w-3.5 h-3.5" />,
        };
      case "gemini":
        return {
          label: "Gemini CLI",
          badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          avatarBg: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white",
          icon: <Zap className="w-3.5 h-3.5" />,
        };
      case "openai":
        return {
          label: "Codex / OpenAI",
          badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          avatarBg: "bg-gradient-to-br from-emerald-600 to-teal-700 text-white",
          icon: <Bot className="w-3.5 h-3.5" />,
        };
      case "cursor":
        return {
          label: "Cursor",
          badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          avatarBg: "bg-gradient-to-br from-purple-600 to-pink-700 text-white",
          icon: <TerminalIcon className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: "AI Agent",
          badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          avatarBg: "bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-100",
          icon: <Bot className="w-3.5 h-3.5" />,
        };
    }
  };

  const providerConfig = isAgent ? getProviderConfig(message.provider) : null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative flex items-start gap-3 py-2 px-2.5 rounded-lg hover:bg-relay-surface/80 transition-colors text-xs">
      {/* Avatar */}
      {isAgent && providerConfig ? (
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${providerConfig.avatarBg}`}
          title={`${message.author_name} (${providerConfig.label})`}
        >
          {providerConfig.icon}
        </div>
      ) : (
        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm">
          {message.author_name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Message Body */}
      <div className="flex-1 min-w-0 pr-8">
        {/* Author Header */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-relay-text text-[12.5px]">
            {message.author_name}
          </span>

          {/* Agent Pill Badge */}
          {isAgent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
              <Bot className="w-2.5 h-2.5" />
              Agent
            </span>
          )}

          {/* Provider Chip */}
          {isAgent && providerConfig && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${providerConfig.badgeColor}`}
            >
              {providerConfig.label}
            </span>
          )}

          {/* Model info */}
          {isAgent && message.model && message.model !== "default" && message.model !== "unknown" && (
            <span className="text-[10px] text-relay-muted font-mono bg-relay-surface px-1.5 py-0.2 rounded border border-relay-border/60">
              {message.model}
            </span>
          )}

          {/* Reply depth badge */}
          {isAgent && message.reply_depth > 0 && (
            <span
              className="text-[9px] px-1.5 py-0.2 rounded bg-relay-canvas text-relay-muted border border-relay-border font-mono"
              title={`Automated reply depth: ${message.reply_depth} (Limit: ${maxDepth})`}
            >
              depth {message.reply_depth}/{maxDepth}
            </span>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-relay-muted ml-auto font-mono">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Formatted Markdown Content */}
        <div className="mt-1">
          <MarkdownRenderer content={message.content} />
        </div>
      </div>

      {/* Hover Action Bar */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-relay-canvas border border-relay-border rounded-md shadow-md p-0.5">
        <button
          onClick={handleCopyMessage}
          className="p-1 rounded hover:bg-relay-surface text-relay-muted hover:text-relay-text transition-colors"
          title="Copy message"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {onQuote && (
          <button
            onClick={() => onQuote(message.author_name, message.content)}
            className="p-1 rounded hover:bg-relay-surface text-relay-muted hover:text-relay-text transition-colors"
            title="Quote message"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
