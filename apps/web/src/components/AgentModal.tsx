"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

type AgentType = "gemini" | "claude" | "cursor" | "codex" | "custom";

interface AgentTypeOption {
  id: AgentType;
  name: string;
  defaultName: string;
  engine: string;
  badge: string;
  desc: string;
}

const AGENT_TYPES: AgentTypeOption[] = [
  {
    id: "gemini",
    name: "Gemini CLI / Antigravity",
    defaultName: "gemini",
    engine: "Google session (gemini / agy)",
    badge: "Google",
    desc: "Uses your active Google session or local agy CLI without API keys",
  },
  {
    id: "claude",
    name: "Claude Code",
    defaultName: "claude",
    engine: "Claude CLI session",
    badge: "Anthropic",
    desc: "Uses your authenticated Claude Code CLI terminal session",
  },
  {
    id: "cursor",
    name: "Cursor Agent",
    defaultName: "cursor",
    engine: "Cursor editor agent",
    badge: "Cursor",
    desc: "Connects your local Cursor background session",
  },
  {
    id: "codex",
    name: "Codex CLI",
    defaultName: "codex",
    engine: "Codex CLI session",
    badge: "Codex",
    desc: "Connects your local Codex CLI session",
  },
];

export function AgentModal() {
  const { activeWorkspace, activeRoom, agents, setAgents, isAgentModalOpen, setAgentModalOpen } =
    useRelayStore();

  const [activeTab, setActiveTab] = useState<"connect" | "manage">("connect");
  const [agentName, setAgentName] = useState("gemini");
  const [agentType, setAgentType] = useState<AgentType>("gemini");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Temporary 60-second pairing code state
  const [pairingData, setPairingData] = useState<{
    code: string;
    room_name: string;
    agent_name: string;
    agent_type: string;
    expires_in_seconds: number;
    instructions: string[];
  } | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [pairingStatus, setPairingStatus] = useState<"pending" | "connected" | "expired">("pending");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectType = (t: AgentType) => {
    setAgentType(t);
    const found = AGENT_TYPES.find((opt) => opt.id === t);
    if (found) {
      setAgentName(found.defaultName);
    }
  };

  // Countdown timer for 60s TTL
  useEffect(() => {
    if (!pairingData || pairingStatus !== "pending") return;

    setSecondsRemaining(60);
    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setPairingStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [pairingData, pairingStatus]);

  // Polling for device attach
  useEffect(() => {
    if (!pairingData || pairingStatus !== "pending") return;

    const poll = async () => {
      try {
        const res = await api.getPairingStatus(pairingData.code);
        if (res.status === "connected") {
          setPairingStatus("connected");
          if (activeWorkspace) {
            const updated = await api.getAgents(activeWorkspace.id);
            setAgents(updated);
          }
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        } else if (res.status === "expired") {
          setPairingStatus("expired");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (e) {
        // Silently retry
      }
    };

    pollTimerRef.current = setInterval(poll, 1500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [pairingData, pairingStatus, activeWorkspace, setAgents]);

  if (!isAgentModalOpen || !activeWorkspace) return null;

  const handleConnectDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !activeRoom) return;

    setSubmitting(true);
    try {
      const res = await api.createDevicePairing(
        agentName.trim(),
        agentType,
        activeRoom.id
      );
      setPairingData(res);
      setPairingStatus("pending");
      setSecondsRemaining(res.expires_in_seconds || 60);
    } catch (err: any) {
      alert(`Could not start device pairing: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete AI agent @${name}?`)) return;
    setDeletingId(id);
    try {
      await api.deleteAgent(id);
      setAgents(agents.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(`Failed to delete agent: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleClose = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPairingData(null);
    setPairingStatus("pending");
    setAgentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#12141c] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">
                AI Coding Agents
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400">
              Orchestrate local AI agents using your native CLI sessions. No API keys required.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("connect");
              setPairingData(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === "connect"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            + Connect Device
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "manage"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Manage Agents</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 font-mono">
              {agents.length}
            </span>
          </button>
        </div>

        {activeTab === "manage" ? (
          /* Manage & Delete Agents Tab */
          <div className="space-y-3 pt-1">
            {agents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
                  <Bot className="w-5 h-5" />
                </div>
                <p className="text-xs text-zinc-400">No agents connected to this workspace yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("connect")}
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  Connect your first device &rarr;
                </button>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {agents.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-400 font-mono text-xs">
                        @
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-xs">
                            @{ag.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono capitalize border border-zinc-700/60">
                            {ag.type || ag.provider || "gemini"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ag.status === "online"
                                ? "bg-emerald-400"
                                : ag.status === "busy"
                                ? "bg-amber-400"
                                : "bg-zinc-600"
                            }`}
                          />
                          <span className="capitalize">{ag.status}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === ag.id}
                      onClick={() => handleDeleteAgent(ag.id, ag.name)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-xs"
                      title={`Delete @${ag.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === ag.id ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : pairingData ? (
          /* Step 2: Temporary 60-Second Pairing Code Screen */
          <div className="space-y-4 pt-1">
            {pairingStatus === "connected" ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-semibold text-emerald-300">
                  Device Connected Successfully!
                </h4>
                <p className="text-xs text-zinc-400">
                  Agent <strong className="text-zinc-200 font-mono">@{pairingData.agent_name}</strong> is paired to <span className="text-indigo-400">#{pairingData.room_name}</span>.
                </p>
                <div className="pt-2 text-[11px] text-zinc-500">
                  Run in your terminal to start streaming:
                  <div className="mt-1 font-mono text-xs text-zinc-200 bg-black/50 p-2 rounded border border-zinc-800">
                    relay agent run {pairingData.agent_type}
                  </div>
                </div>
              </div>
            ) : pairingStatus === "expired" ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h4 className="text-sm font-semibold text-red-300">
                  Pairing Code Expired
                </h4>
                <p className="text-xs text-zinc-400">
                  Temporary codes expire in 60 seconds for security.
                </p>
                <button
                  type="button"
                  onClick={() => setPairingData(null)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
                >
                  Generate Fresh Code
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-[#161924] border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Temporary Pairing Code:</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-[10px] font-semibold border border-amber-500/30">
                      Expires in {secondsRemaining}s
                    </span>
                  </div>

                  {/* 8-character human-readable code */}
                  <div className="text-center py-2.5 bg-black/50 rounded-lg border border-zinc-800 relative group">
                    <span className="text-3xl font-mono font-bold tracking-widest text-indigo-400">
                      {pairingData.code}
                    </span>
                  </div>

                  {/* Terminal instructions */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                      <span>Run in your local terminal:</span>
                      <span className="text-[10px] text-zinc-500">Native CLI session</span>
                    </label>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      {/* Step 1: Login */}
                      <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-zinc-800/80">
                        <span className="text-zinc-300">1. relay login</span>
                        <button
                          type="button"
                          onClick={() => handleCopy("relay login", "login")}
                          className="text-zinc-500 hover:text-zinc-200 transition-colors"
                          title="Copy command"
                        >
                          {copiedCmd === "login" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Step 2: Attach device */}
                      <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-indigo-500/30">
                        <span className="text-indigo-300 font-semibold">
                          2. relay agent attach {pairingData.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`relay agent attach ${pairingData.code}`, "attach")}
                          className="text-zinc-400 hover:text-white transition-colors"
                          title="Copy command"
                        >
                          {copiedCmd === "attach" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </button>
                      </div>

                      {/* Step 3: Run agent */}
                      <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-zinc-800/80">
                        <span className="text-zinc-300">
                          3. relay agent run {pairingData.agent_type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`relay agent run ${pairingData.agent_type}`, "run")}
                          className="text-zinc-500 hover:text-zinc-200 transition-colors"
                          title="Copy command"
                        >
                          {copiedCmd === "run" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live waiting indicator */}
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Waiting for terminal device connection...</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                {pairingStatus === "connected" ? "Done" : "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Clean Add Agent Form (Name, Type, Room) */
          <form onSubmit={handleConnectDevice} className="space-y-4 pt-1">
            {/* Field 1: Agent name */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium block">
                Agent Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. gemini, murtazo-gemini, claude"
                  className="w-full pl-7 pr-3 py-2 bg-[#171922] border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Mention this handle in room threads (e.g. @{agentName || "gemini"}).
              </p>
            </div>

            {/* Field 2: Agent type select */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium block">
                Agent Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AGENT_TYPES.map((opt) => {
                  const isSelected = agentType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectType(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500 text-zinc-100 ring-1 ring-indigo-500/40"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs text-zinc-200">
                          {opt.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-400">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 3: Current Room */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium block">
                Target Room
              </label>
              <div className="px-3 py-2 bg-[#171922] border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-indigo-400">#</span>
                  <span>{activeRoom?.name || "general"}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  current room
                </span>
              </div>
            </div>

            {/* Zero API keys guarantee */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-2.5 text-[11px] text-zinc-400">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-200 block font-medium">Native CLI Sessions</strong>
                Relay never asks for API keys. It pairs your device and uses your existing authenticated CLI session directly.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !agentName.trim() || !activeRoom}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md disabled:opacity-40 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Connect Device</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
