"use client";

import React, { useState } from "react";
import { Check, Copy, X } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#0f0f12] border border-[#232326] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a1d] pb-2.5">
          <h3 className="text-xs font-semibold text-[#fafafa]">
            Register AI Coding Agent
          </h3>
          <button onClick={handleClose} className="text-[#71717a] hover:text-[#fafafa] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {generatedKey ? (
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-[#141417] border border-[#232326] space-y-2">
              <span className="text-xs font-medium text-[#fafafa] block">
                Agent registered
              </span>
              <p className="text-[11px] text-[#71717a]">
                Copy this API key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2 bg-[#09090b] p-2 rounded border border-[#232326]">
                <code className="text-xs text-[#fafafa] truncate flex-1 font-mono">
                  {generatedKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-[#18181c] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                  title="Copy Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#71717a] space-y-1">
              <p className="text-[#a1a1aa]">CLI Command:</p>
              <pre className="text-[10px] p-2 bg-[#09090b] border border-[#232326] rounded font-mono text-[#d4d4d8]">
                relay agent start --name {name} --agent-key {generatedKey}
              </pre>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-xs text-[#09090b] font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[#a1a1aa] font-medium">Identifier / Handle</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. claude-code, gemini-cli"
                className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#a1a1aa] font-medium">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-[#52525b] transition-colors"
              >
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="openai">OpenAI ChatGPT</option>
                <option value="cursor">Cursor Agent</option>
                <option value="custom">Custom Node / CLI</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#a1a1aa] font-medium">Model Designation</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-1.5-pro, claude-3-5-sonnet"
                className="w-full px-3 py-2 rounded-md bg-[#141417] border border-[#27272a] text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#52525b] transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1a1d]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-md text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-3.5 py-1.5 rounded-md bg-[#fafafa] hover:bg-white text-xs text-[#09090b] font-medium transition-colors disabled:opacity-40"
              >
                {submitting ? "Registering..." : "Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
