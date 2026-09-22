"use client";

import React, { useEffect, useState } from "react";
import { Bot, FileText, Hash, MessageSquare, Search, X } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

export function SearchModal() {
  const {
    activeWorkspace,
    isSearchModalOpen,
    setSearchModalOpen,
    setActiveRoom,
    setActiveThread,
  } = useRelayStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if (e.key === "Escape") {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchModalOpen]);

  useEffect(() => {
    if (!query.trim() || !activeWorkspace) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(activeWorkspace.id, query.trim());
        setResults(res.results || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeWorkspace]);

  if (!isSearchModalOpen) return null;

  const getItemIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case "thread":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "room":
        return <Hash className="w-4 h-4 text-amber-400" />;
      case "agent":
        return <Bot className="w-4 h-4 text-purple-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-[#111420] border border-[#21283c] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="p-3 border-b border-[#1f2638] flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, threads, rooms, agents, code..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#1a2030]">
          {loading && (
            <div className="p-4 text-center text-xs text-slate-400">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading &&
            results.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (item.room_id) setActiveRoom({ id: item.room_id } as any);
                  if (item.thread_id) setActiveThread({ id: item.thread_id } as any);
                  setSearchModalOpen(false);
                }}
                className="p-3 rounded-lg hover:bg-[#161a28] cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center gap-2">
                  {getItemIcon(item.type)}
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1 rounded bg-[#1c2234] text-slate-400 ml-auto">
                    {item.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 pl-6">
                  {item.snippet}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
