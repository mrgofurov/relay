"use client";

import React, { useState } from "react";
import { Sliders, X } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

export function RoomSettingsModal() {
  const { activeRoom, setActiveRoom, setRooms, rooms, isSettingsOpen, setSettingsOpen } =
    useRelayStore();

  const [autoDiscussion, setAutoDiscussion] = useState(
    activeRoom?.auto_discussion ?? true
  );
  const [maxDepth, setMaxDepth] = useState(activeRoom?.max_reply_depth ?? 3);
  const [humanApproval, setHumanApproval] = useState(
    activeRoom?.human_approval ?? false
  );
  const [saving, setSaving] = useState(false);

  if (!isSettingsOpen || !activeRoom) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateRoomSettings(activeRoom.id, {
        auto_discussion: autoDiscussion,
        max_reply_depth: Number(maxDepth),
        human_approval: humanApproval,
      });
      setActiveRoom(updated);
      setRooms(rooms.map((r) => (r.id === updated.id ? updated : r)));
      setSettingsOpen(false);
    } catch (e: any) {
      alert(`Failed to save room settings: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#0f0f12] border border-[#232326] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a1d] pb-2.5">
          <h3 className="text-xs font-semibold text-[#fafafa]">
            Room Settings: #{activeRoom.name}
          </h3>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Auto Discussion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-md bg-[#141417] border border-[#232326]">
            <div>
              <span className="font-medium text-[#fafafa] block">Autonomous Discussion</span>
              <span className="text-[11px] text-[#71717a]">
                Allow AI agents to autonomously reply to each other in threads
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoDiscussion}
              onChange={(e) => setAutoDiscussion(e.target.checked)}
              className="w-4 h-4 rounded text-black bg-[#1f1f23] border-[#3f3f46] accent-white cursor-pointer"
            />
          </div>

          {/* Max Reply Depth Slider */}
          <div className="p-3 rounded-md bg-[#141417] border border-[#232326] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-[#fafafa]">Max Reply Depth</span>
              <span className="px-1.5 py-0.2 rounded bg-[#1c1c20] text-[#fafafa] font-mono text-xs border border-[#2e2e33]">
                {maxDepth} replies
              </span>
            </div>
            <p className="text-[11px] text-[#71717a]">
              Guards against runaway token loops. Automated replies stop once reached.
            </p>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-white cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#52525b] font-mono">
              <span>1</span>
              <span>Default: 3</span>
              <span>10</span>
            </div>
          </div>

          {/* Human Approval Toggle */}
          <div className="flex items-center justify-between p-3 rounded-md bg-[#141417] border border-[#232326]">
            <div>
              <span className="font-medium text-[#fafafa]">Human Approval Gate</span>
              <span className="text-[11px] text-[#71717a]">
                Require human sign-off before subsequent agent reactions trigger
              </span>
            </div>
            <input
              type="checkbox"
              checked={humanApproval}
              onChange={(e) => setHumanApproval(e.target.checked)}
              className="w-4 h-4 rounded text-black bg-[#1f1f23] border-[#3f3f46] accent-white cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1a1d]">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-3 py-1.5 rounded-md text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-xs text-[#09090b] font-medium transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
