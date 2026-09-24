"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Code2,
  Paperclip,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";

interface ComposeBarProps {
  onSendMessage: (content: string, mentions: string[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  initialContent?: string | null;
  onClearInitialContent?: () => void;
}

export function ComposeBar({
  onSendMessage,
  onTyping,
  initialContent,
  onClearInitialContent,
}: ComposeBarProps) {
  const { agents } = useRelayStore();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialContent) {
      setContent((prev) => initialContent + prev);
      if (onClearInitialContent) onClearInitialContent();
      textareaRef.current?.focus();
    }
  }, [initialContent, onClearInitialContent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Auto-adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }

    // Check if user is typing mention
    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("@")) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }

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
    textareaRef.current?.focus();
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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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
    <div className="p-3 bg-[#0c0d11] border-t border-zinc-800 relative text-xs">
      {/* Mention autocomplete popup */}
      {showMentions && (
        <div className="absolute bottom-full mb-2 left-4 w-72 bg-[#12141a] border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-30 space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-indigo-400" />
            <span>Mention Team or Agent</span>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            <button
              type="button"
              onClick={() => handleInsertMention("everyone")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 text-xs text-zinc-200 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-amber-400 font-medium">@everyone</span>
                <p className="text-[10px] text-zinc-500 truncate">Notify all developers & agents</p>
              </div>
            </button>

            {agents.map((ag) => (
              <button
                key={ag.id}
                type="button"
                onClick={() => handleInsertMention(ag.name)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 text-xs text-zinc-200 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-zinc-100 font-medium">@{ag.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 capitalize">{ag.provider}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      ag.status === "online" ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick mention action chips */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5 text-[11px] select-none">
        <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Quick Mention:
        </span>

        {agents.length > 0 ? (
          agents.map((ag) => (
            <button
              key={ag.id}
              type="button"
              onClick={() => handleInsertMention(ag.name)}
              className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[10.5px] font-mono transition-colors flex items-center gap-1 shadow-sm"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  ag.status === "online" ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              @{ag.name}
            </button>
          ))
        ) : (
          <span className="text-[10px] text-zinc-500 italic">
            No agents connected yet. Click &quot;Connect Agent&quot; above to link Claude/Gemini CLI.
          </span>
        )}
      </div>

      {/* Main Composer Box */}
      <div className="relative rounded-xl bg-[#13151b] border border-zinc-800 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          rows={2}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message thread or mention @agent (Shift+Enter for new line)..."
          className="w-full bg-transparent px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed min-h-[44px]"
        />

        {/* Bottom bar of the input */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800/60 bg-[#111318] rounded-b-xl text-[11px]">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="hidden sm:inline text-[10.5px]">
              Use <code className="text-zinc-400 font-mono">@name</code> to invoke agents
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!content.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-sm"
            >
              <span>Send</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
