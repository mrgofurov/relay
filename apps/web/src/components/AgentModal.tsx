"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Radio,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

type ProviderType = "claude" | "gemini" | "cursor" | "openai" | "custom";

interface ProviderOption {
  id: ProviderType;
  name: string;
  defaultHandle: string;
  description: string;
  badge: string;
  color: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "claude",
    name: "Claude Code",
    defaultHandle: "claude-code",
    description: "Connect your local Claude Code terminal session",
    badge: "Anthropic",
    color: "from-amber-600 to-orange-700",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    defaultHandle: "gemini-cli",
    description: "Connect your local Gemini CLI developer session",
    badge: "Google",
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "cursor",
    name: "Cursor Agent",
    defaultHandle: "cursor-agent",
    description: "Connect your Cursor editor background agent",
    badge: "Cursor",
    color: "from-purple-600 to-pink-700",
  },
  {
    id: "custom",
    name: "Custom / Local LLM",
    defaultHandle: "local-agent",
    description: "Connect custom Python/Go/TS agent via Relay SDK",
    badge: "SDK",
    color: "from-zinc-700 to-zinc-900",
  },
];

export function AgentModal() {
  const { activeWorkspace, agents, setAgents, isAgentModalOpen, setAgentModalOpen } =
    useRelayStore();

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("claude");
  const [name, setName] = useState("claude-code");
  const [model, setModel] = useState("default");
  const [submitting, setSubmitting] = useState(false);

  // Connection code state
  const [connectionData, setConnectionData] = useState<{
    connectionId: string;
    agentId: string;
    displayCode: string;
    cliCommand: string;
    expiresInSeconds: number;
  } | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"pending" | "connected" | "expired">("pending");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Change default handle when provider changes
  const handleSelectProvider = (prov: ProviderType) => {
    setSelectedProvider(prov);
    const found = PROVIDERS.find((p) => p.id === prov);
    if (found) {
      setName(found.defaultHandle);
    }
  };

  // Poll for connection status once code is generated
  useEffect(() => {
    if (!connectionData || connectionStatus === "connected") return;

    const poll = async () => {
      try {
        const res = await api.getConnectionStatus(connectionData.connectionId);
        if (res.status === "connected") {
          setConnectionStatus("connected");
          // Refresh workspace agents
          if (activeWorkspace) {
            const updatedAgents = await api.getAgents(activeWorkspace.id);
            setAgents(updatedAgents);
          }
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else if (res.status === "expired") {
          setConnectionStatus("expired");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (e) {
        // Silently retry
      }
    };

    pollTimerRef.current = setInterval(poll, 2500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [connectionData, connectionStatus, activeWorkspace, setAgents]);

  if (!isAgentModalOpen || !activeWorkspace) return null;

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.createAgentConnection(name.trim(), selectedProvider, model);
      setConnectionData({
        connectionId: res.connection_id,
        agentId: res.agent_id,
        displayCode: res.display_code,
        cliCommand: res.cli_command,
        expiresInSeconds: res.expires_in_seconds,
      });
      setConnectionStatus("pending");
    } catch (err: any) {
      alert(`Could not create agent connection: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCommand = () => {
    if (connectionData) {
      navigator.clipboard.writeText(connectionData.cliCommand);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setConnectionData(null);
    setConnectionStatus("pending");
    setAgentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#12141c] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Connect AI Coding Agent
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400">
              Zero-cost session pairing. Connect your local terminal session without external paid API keys.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {connectionData ? (
          /* Step 2: One-time Code Display & Polling */
          <div className="space-y-4">
            {connectionStatus === "connected" ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-semibold text-emerald-300">
                  Agent Connected Successfully!
                </h4>
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-200 font-mono">@{name}</strong> is now live in this workspace. You can mention it in any room thread.
                </p>
              </div>
            ) : connectionStatus === "expired" ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h4 className="text-sm font-semibold text-red-300">
                  Connection Code Expired
                </h4>
                <p className="text-xs text-zinc-400">
                  The 10-minute window expired. Please generate a new connection code.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-[#161924] border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">One-Time Pairing Code:</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      Expires in 10m
                    </span>
                  </div>

                  <div className="text-center py-2 bg-black/40 rounded-lg border border-zinc-800">
                    <span className="text-2xl font-mono font-bold tracking-widest text-indigo-400">
                      {connectionData.displayCode}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                      <span>Run in your local terminal:</span>
                      <span className="text-[10px] text-zinc-500">Uses your active session</span>
                    </label>
                    <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-lg border border-zinc-800">
                      <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <code className="text-xs text-zinc-200 truncate flex-1 font-mono">
                        {connectionData.cliCommand}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCommand}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-medium"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live waiting indicator */}
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Waiting for terminal connection...</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                {connectionStatus === "connected" ? "Done" : "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Provider selection & Configuration */
          <form onSubmit={handleGenerateCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-zinc-300 font-medium block">
                1. Select AI Agent Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((prov) => {
                  const isSelected = selectedProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleSelectProvider(prov.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500/60 text-zinc-100 shadow-sm ring-1 ring-indigo-500/40"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-zinc-200">
                          {prov.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-400">
                          {prov.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">
                        {prov.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium flex items-center justify-between">
                <span>2. Agent Handle / Name</span>
                <span className="text-[10px] text-zinc-500">Used for @mentions</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. claude-code"
                  className="w-full pl-7 pr-3 py-2 bg-[#171922] border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 font-mono"
                />
              </div>
            </div>

            {/* Zero cost highlight banner */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-2.5 text-[11px] text-zinc-400">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-200 block font-medium">No Paid API Keys Required</strong>
                Relay uses an end-to-end device token paired with your existing local developer session.
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
                disabled={submitting || !name.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md disabled:opacity-40"
              >
                {submitting ? "Generating Code..." : "Generate Connection Code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
