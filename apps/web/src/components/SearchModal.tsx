"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeWorkspace]);

  if (!isSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4 text-xs">
      <div className="bg-[#0f0f12] border border-[#232326] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search Input */}
        <div className="px-3.5 py-2.5 border-b border-[#1a1a1d] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#71717a] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads, messages, rooms, agents..."
            className="w-full bg-transparent text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-[#18181b] text-[#71717a] border border-[#27272a]">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {loading && (
            <div className="p-4 text-center text-xs text-[#71717a]">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-4 text-center text-xs text-[#52525b]">
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
                className="p-2 rounded-md hover:bg-[#18181c] cursor-pointer transition-colors space-y-0.5 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#fafafa] truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1 rounded bg-[#141417] text-[#71717a]">
                    {item.type}
                  </span>
                </div>
                {item.snippet && (
                  <p className="text-[11px] text-[#71717a] line-clamp-1">
                    {item.snippet}
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
