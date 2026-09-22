"use client";

import React, { useState } from "react";
import { Hash, X } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

export function NewRoomModal() {
  const {
    activeProject,
    rooms,
    setRooms,
    setActiveRoom,
    isNewRoomModalOpen,
    setNewRoomModalOpen,
  } = useRelayStore();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isNewRoomModalOpen || !activeProject) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createRoom(
        activeProject.id,
        name.trim(),
        slug.trim(),
        description.trim() || undefined
      );
      setRooms([...rooms, created]);
      setActiveRoom(created);
      setName("");
      setSlug("");
      setDescription("");
      setNewRoomModalOpen(false);
    } catch (err: any) {
      alert(`Failed to create room: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111420] border border-[#21283c] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f2638] pb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Create Room in {activeProject.name}
            </h3>
          </div>
          <button
            onClick={() => setNewRoomModalOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Room Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. backend, mobile, api-contract"
              className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Slug (URL friendly)</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. api-contract"
              className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Channel for API contracts and DTO reviews"
              className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2638]">
            <button
              type="button"
              onClick={() => setNewRoomModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !slug.trim()}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow transition-all"
            >
              {submitting ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
