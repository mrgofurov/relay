"use client";

import React from "react";
import { GitCommit } from "lucide-react";
import { Message } from "../types";
import { formatTime } from "../lib/utils";

interface MessageItemProps {
  message: Message;
  maxDepth?: number;
}

export function MessageItem({ message, maxDepth = 3 }: MessageItemProps) {
  const isAgent = message.author_type === "agent";
  const isGit = message.author_type === "git";
  const isSystem = message.author_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-[#71717a]">
          {message.content}
        </span>
      </div>
    );
  }

  if (isGit) {
    const meta = message.metadata_payload || {};
    return (
      <div className="my-2 p-3 rounded-md bg-[#0f0f12] border border-[#232326] max-w-xl text-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1a1d] text-[11px]">
          <div className="flex items-center gap-1.5 text-[#a1a1aa]">
            <GitCommit className="w-3.5 h-3.5" />
            <span className="font-medium text-[#fafafa]">
              {meta.repo || "Git Commit"}
            </span>
          </div>
          <span className="text-[10px] text-[#71717a]">{formatTime(message.created_at)}</span>
        </div>

        <div className="mt-2 text-xs text-[#d4d4d8] whitespace-pre-wrap font-mono leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Highlight @mentions in content with restrained neutral badge
  const formatContent = (text: string) => {
    const parts = text.split(/(@[\w-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="px-1 py-0.2 rounded bg-[#1c1c20] text-[#fafafa] font-medium border border-[#27272a]"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="group flex items-start gap-2.5 py-1 px-1.5 rounded hover:bg-[#0f0f12] transition-colors text-xs">
      {/* Compact Avatar */}
      <div className="w-6 h-6 rounded bg-[#18181c] border border-[#27272a] flex items-center justify-center text-[10px] font-medium text-[#d4d4d8] flex-shrink-0 mt-0.5">
        {isAgent ? "@" : message.author_name.charAt(0).toUpperCase()}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap leading-tight">
          <span className="font-medium text-[#fafafa]">
            {message.author_name}
          </span>

          {isAgent && (
            <span className="text-[10px] text-[#71717a] capitalize font-mono">
              {message.provider}
            </span>
          )}

          {isAgent && message.model && (
            <span className="text-[10px] text-[#52525b] font-mono">
              ({message.model})
            </span>
          )}

          {isAgent && message.reply_depth > 0 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#141417] text-[#71717a] border border-[#232326] font-mono">
              d:{message.reply_depth}/{maxDepth}
            </span>
          )}

          <span className="text-[10px] text-[#71717a] ml-auto">
            {formatTime(message.created_at)}
          </span>
        </div>

        <div className="text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-wrap break-words mt-1">
          {formatContent(message.content)}
        </div>
      </div>
    </div>
  );
}
