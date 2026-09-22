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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111420] border border-[#21283c] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f2638] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Start New Thread in #{activeRoom.name}
            </h3>
          </div>
          <button
            onClick={() => setNewThreadModalOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Thread Title / Topic</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Product DTO v2 Schema Design"
              className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Initial Message (Optional)</label>
            <textarea
              rows={3}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Introduce the task or mention agents (e.g. '@gemini-cli can you review...')"
              className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2638]">
            <button
              type="button"
              onClick={() => setNewThreadModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow transition-all"
            >
              {submitting ? "Creating..." : "Create Thread"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
