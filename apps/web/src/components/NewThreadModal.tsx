"use client";

import React, { useState } from "react";
import { MessageSquare, Plus, X } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

export function NewThreadModal() {
  const {
    activeRoom,
    threads,
    setThreads,
    setActiveThread,
    isNewThreadModalOpen,
    setNewThreadModalOpen,
  } = useRelayStore();

  const [title, setTitle] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isNewThreadModalOpen || !activeRoom) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createThread(
        activeRoom.id,
        title.trim(),
        initialMessage.trim() || undefined
      );
      setThreads([created, ...threads]);
      setActiveThread(created);
      setTitle("");
      setInitialMessage("");
      setNewThreadModalOpen(false);
    } catch (err: any) {
      alert(`Failed to create thread: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#0f0f12] border border-[#232326] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a1d] pb-2.5">
          <h3 className="text-xs font-semibold text-[#fafafa]">
            New Thread in #{activeRoom.name}
          </h3>
          <button
            onClick={() => setNewThreadModalOpen(false)}
            className="text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[#a1a1aa] font-medium">Topic / Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Architecture RFC: API Schema v2"
              className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#a1a1aa] font-medium">Initial Context (Optional)</label>
            <textarea
              rows={3}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Describe topic or mention agents (@gemini, @claude)..."
              className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] resize-none leading-relaxed transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1a1d]">
            <button
              type="button"
              onClick={() => setNewThreadModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-3.5 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-xs text-[#09090b] font-medium transition-colors disabled:opacity-40"
            >
              {submitting ? "Creating..." : "Create Thread"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
