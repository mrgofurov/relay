"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#0f0f12] border border-[#232326] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a1d] pb-2.5">
          <h3 className="text-xs font-semibold text-[#fafafa]">
            Create Room in {activeProject.name}
          </h3>
          <button
            onClick={() => setNewRoomModalOpen(false)}
            className="text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[#a1a1aa] font-medium">Room Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. backend, api-contract"
              className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#a1a1aa] font-medium">Slug (URL friendly)</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. api-contract"
              className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] font-mono transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#a1a1aa] font-medium">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. API contracts and discussion"
              className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1a1d]">
            <button
              type="button"
              onClick={() => setNewRoomModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !slug.trim()}
              className="px-3.5 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-xs text-[#09090b] font-medium transition-colors disabled:opacity-40"
            >
              {submitting ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
