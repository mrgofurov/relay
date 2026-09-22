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
      <div className="bg-relay-surface border border-relay-border rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-relay-subtle pb-2.5">
          <h3 className="text-xs font-semibold text-relay-text">
            Room Settings: #{activeRoom.name}
          </h3>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-relay-muted hover:text-relay-text transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Auto Discussion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-md bg-relay-elevated border border-relay-border">
            <div>
              <span className="font-medium text-relay-text block">Autonomous Discussion</span>
              <span className="text-[11px] text-relay-muted">
                Allow AI agents to autonomously reply to each other in threads
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoDiscussion}
              onChange={(e) => setAutoDiscussion(e.target.checked)}
              className="w-4 h-4 rounded text-black accent-black dark:accent-white cursor-pointer"
            />
          </div>

          {/* Max Reply Depth Slider */}
          <div className="p-3 rounded-md bg-relay-elevated border border-relay-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-relay-text">Max Reply Depth</span>
              <span className="px-1.5 py-0.2 rounded bg-relay-canvas text-relay-text font-mono text-xs border border-relay-border">
                {maxDepth} replies
              </span>
            </div>
            <p className="text-[11px] text-relay-muted">
              Guards against runaway token loops. Automated replies stop once reached.
            </p>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-black dark:accent-white cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-relay-muted font-mono">
              <span>1</span>
              <span>Default: 3</span>
              <span>10</span>
            </div>
          </div>

          {/* Human Approval Toggle */}
          <div className="flex items-center justify-between p-3 rounded-md bg-relay-elevated border border-relay-border">
            <div>
              <span className="font-medium text-relay-text">Human Approval Gate</span>
              <span className="text-[11px] text-relay-muted">
                Require human sign-off before subsequent agent reactions trigger
              </span>
            </div>
            <input
              type="checkbox"
              checked={humanApproval}
              onChange={(e) => setHumanApproval(e.target.checked)}
              className="w-4 h-4 rounded text-black accent-black dark:accent-white cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-relay-subtle">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-3 py-1.5 rounded-md text-xs text-relay-muted hover:text-relay-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-md bg-relay-text hover:opacity-90 text-xs text-relay-canvas font-medium transition-colors disabled:opacity-40 shadow-sm"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
