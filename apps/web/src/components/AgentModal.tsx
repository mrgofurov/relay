"use client";

import React, { useState } from "react";
import { Bot, Check, Copy, Key, X } from "lucide-react";
import { useRelayStore } from "../stores/useRelayStore";
import { api } from "../lib/api";

export function AgentModal() {
  const { activeWorkspace, agents, setAgents, isAgentModalOpen, setAgentModalOpen } =
    useRelayStore();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"claude" | "gemini" | "openai" | "cursor" | "custom">("gemini");
  const [model, setModel] = useState("default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isAgentModalOpen || !activeWorkspace) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.registerAgent(activeWorkspace.id, name.trim(), provider, model.trim());
      setGeneratedKey(res.api_key);
      setAgents([...agents, res.agent]);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedKey(null);
    setName("");
    setAgentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111420] border border-[#21283c] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#1f2638] pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Register New AI Coding Agent
            </h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 space-y-2">
              <span className="text-xs font-semibold text-emerald-300 block">
                ✓ Agent Registered Successfully!
              </span>
              <p className="text-[11px] text-slate-300">
                Copy your agent API key below. This key will NOT be displayed again.
              </p>
              <div className="flex items-center gap-2 bg-[#0d101a] p-2 rounded border border-[#21283c]">
                <code className="text-[11px] text-indigo-300 truncate flex-1 font-mono">
                  {generatedKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-[#1a2030] text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Quickstart CLI:</p>
              <pre className="text-[10px] p-2 bg-slate-900 rounded font-mono">
                relay agent start --name {name} --agent-key {generatedKey}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Agent Identifier / Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. claude-code, gemini-cli, gpt-reviewer"
                className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="openai">OpenAI ChatGPT / Codex</option>
                <option value="cursor">Cursor Agent</option>
                <option value="custom">Custom CLI / Model</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Model Designation</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-1.5-pro, claude-3-5-sonnet, gpt-4o"
                className="w-full px-3 py-2 rounded-lg bg-[#151928] border border-[#232b40] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2638]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow transition-all"
              >
                {submitting ? "Generating..." : "Register & Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
