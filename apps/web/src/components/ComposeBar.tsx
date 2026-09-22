"use client";

import React, { useRef, useState } from "react";
import { Bot, CornerDownLeft, Send, Sparkles } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { cn } from "../lib/utils";

interface ComposeBarProps {
  onSendMessage: (content: string, mentions: string[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export function ComposeBar({ onSendMessage, onTyping }: ComposeBarProps) {
  const { agents } = useRelayStore();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Check if user just typed @
    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("@")) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }

    // Trigger typing notification
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleInsertMention = (handle: string) => {
    const words = content.split(/\s+/);
    words.pop();
    words.push(`@${handle} `);
    setContent(words.join(" "));
    setShowMentions(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    onTyping(false);
    try {
      const mentions = Array.from(content.matchAll(/@([\w-]+)/g)).map((m) => `@${m[1].toLowerCase()}`);
      await onSendMessage(content.trim(), mentions);
      setContent("");
      setShowMentions(false);
    } catch (err: any) {
      alert(`Send message error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 bg-[#0d101a] border-t border-[#1a2030] relative">
      {/* Mention autocomplete popup */}
      {showMentions && (
        <div className="absolute bottom-full mb-2 left-4 w-72 bg-[#131724] border border-[#21283c] rounded-lg shadow-xl p-1.5 z-20 space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Mention Agent or Team
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            <button
              type="button"
              onClick={() => handleInsertMention("everyone")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1c2234] text-xs text-slate-200 transition-colors"
            >
              <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                @
              </span>
              <span>@everyone</span>
            </button>

            {agents.map((ag) => (
              <button
                key={ag.id}
                type="button"
                onClick={() => handleInsertMention(ag.name)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#1c2234] text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate">@{ag.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{ag.provider}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick mention action chips */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] text-slate-400 uppercase font-medium">Quick Mention:</span>
        <button
          type="button"
          onClick={() => handleInsertMention("gemini")}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/40 text-[10px] transition-all"
        >
          <Sparkles className="w-2.5 h-2.5 text-sky-400" />
          @gemini
        </button>
        <button
          type="button"
          onClick={() => handleInsertMention("claude")}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-[10px] transition-all"
        >
          <Bot className="w-2.5 h-2.5 text-amber-400" />
          @claude
        </button>
        <button
          type="button"
          onClick={() => handleInsertMention("gpt")}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 text-[10px] transition-all"
        >
          <Bot className="w-2.5 h-2.5 text-emerald-400" />
          @gpt
        </button>
      </div>

      {/* Textarea Box */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-[#131724] border border-[#21283c] focus-within:border-indigo-500/60 rounded-lg p-2 transition-all">
          <textarea
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Collaborate inside thread... type '@' to mention AI agent or team member"
            className="w-full bg-transparent border-0 resize-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0 leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="h-10 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all flex-shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 px-1">
        <span>Enter to send, Shift+Enter for new line</span>
        <span>Thread-first isolation active</span>
      </div>
    </div>
  );
}
