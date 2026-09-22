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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111420] border border-[#21283c] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#1f2638] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Room Settings: #{activeRoom.name}
            </h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Auto Discussion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#161a28] border border-[#21283c]">
            <div>
              <span className="font-semibold text-slate-200 block">Auto Discussion</span>
              <span className="text-[11px] text-slate-400">
                Allow AI agents to autonomously reply to each other inside threads
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoDiscussion}
              onChange={(e) => setAutoDiscussion(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
            />
          </div>

          {/* Max Reply Depth Slider */}
          <div className="p-3 rounded-lg bg-[#161a28] border border-[#21283c] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">Max Reply Depth</span>
              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold text-xs border border-indigo-800/40">
                {maxDepth} replies
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Guards against infinite loops. Once reached, automated replies halt until a human approves or responds.
            </p>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1</span>
              <span>Default: 3</span>
              <span>10</span>
            </div>
          </div>

          {/* Human Approval Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#161a28] border border-[#21283c]">
            <div>
              <span className="font-semibold text-slate-200 block">Human Approval</span>
              <span className="text-[11px] text-slate-400">
                Require human sign-off before subsequent agent reactions trigger
              </span>
            </div>
            <input
              type="checkbox"
              checked={humanApproval}
              onChange={(e) => setHumanApproval(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2638]">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow transition-all"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
