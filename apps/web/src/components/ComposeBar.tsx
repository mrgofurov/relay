"use client";

import React, { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";

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

    // Check if user typed @
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
    <div className="p-3 bg-[#09090b] border-t border-[#232326] relative text-xs">
      {/* Mention autocomplete popup */}
      {showMentions && (
        <div className="absolute bottom-full mb-2 left-3 w-64 bg-[#0f0f12] border border-[#232326] rounded-md shadow-2xl p-1 z-20 space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-medium text-[#71717a] uppercase tracking-wider">
            Mention
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            <button
              type="button"
              onClick={() => handleInsertMention("everyone")}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#18181c] text-xs text-[#fafafa] transition-colors text-left"
            >
              <span className="font-mono text-[#a1a1aa]">@everyone</span>
            </button>

            {agents.map((ag) => (
              <button
                key={ag.id}
                type="button"
                onClick={() => handleInsertMention(ag.name)}
                className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-[#18181c] text-xs text-[#fafafa] transition-colors text-left"
              >
                <span className="font-mono text-[#fafafa]">@{ag.name}</span>
                <span className="text-[10px] text-[#71717a] capitalize">{ag.provider}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick mention action chips */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5 text-[11px]">
        <span className="text-[10px] text-[#71717a]">Mention:</span>
        <button
          type="button"
          onClick={() => handleInsertMention("gemini")}
          className="px-1.5 py-0.2 rounded bg-[#141417] hover:bg-[#1c1c20] text-[#a1a1aa] hover:text-[#fafafa] border border-[#232326] text-[10px] font-mono transition-colors"
        >
          @gemini
        </button>
        <button
          type="button"
          onClick={() => handleInsertMention("claude")}
          className="px-1.5 py-0.2 rounded bg-[#141417] hover:bg-[#1c1c20] text-[#a1a1aa] hover:text-[#fafafa] border border-[#232326] text-[10px] font-mono transition-colors"
        >
          @claude
        </button>
        <button
          type="button"
          onClick={() => handleInsertMention("gpt")}
          className="px-1.5 py-0.2 rounded bg-[#141417] hover:bg-[#1c1c20] text-[#a1a1aa] hover:text-[#fafafa] border border-[#232326] text-[10px] font-mono transition-colors"
        >
          @gpt
        </button>
      </div>

      {/* Textarea Box */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-[#0f0f12] border border-[#232326] focus-within:border-[#3f3f46] rounded-md p-2 transition-colors">
          <textarea
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Reply in thread... type '@' to mention agent"
            className="w-full bg-transparent border-0 resize-none text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="h-9 px-3 rounded-md bg-[#fafafa] hover:bg-white disabled:opacity-40 text-[#09090b] text-xs font-medium flex items-center justify-center gap-1 shadow-sm transition-colors flex-shrink-0"
          title="Send (Enter)"
        >
          <span>Send</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </form>
      <div className="flex justify-between items-center text-[10px] text-[#52525b] mt-1.5 px-0.5">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>Thread isolation active</span>
      </div>
    </div>
  );
}
