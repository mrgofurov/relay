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
      <div className="bg-relay-surface border border-relay-border rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-relay-subtle pb-2.5">
          <h3 className="text-xs font-semibold text-relay-text">
            Register AI Coding Agent
          </h3>
          <button onClick={handleClose} className="text-relay-muted hover:text-relay-text transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {generatedKey ? (
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-relay-canvas border border-relay-border space-y-2">
              <span className="text-xs font-medium text-relay-text block">
                Agent registered
              </span>
              <p className="text-[11px] text-relay-muted">
                Copy this API key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2 bg-relay-elevated p-2 rounded border border-relay-border">
                <code className="text-xs text-relay-text truncate flex-1 font-mono">
                  {generatedKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-relay-hover text-relay-secondary hover:text-relay-text transition-colors"
                  title="Copy Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-relay-muted space-y-1">
              <p className="text-relay-secondary font-medium">CLI Command:</p>
              <pre className="text-[10px] p-2 bg-relay-elevated border border-relay-border rounded font-mono text-relay-text">
                relay agent start --name {name} --agent-key {generatedKey}
              </pre>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-md bg-relay-text hover:opacity-90 text-xs text-relay-canvas font-medium transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-relay-secondary font-medium">Identifier / Handle</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. claude-code, gemini-cli"
                className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-secondary transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-relay-secondary font-medium">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text focus:outline-none focus:border-relay-secondary transition-colors"
              >
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="openai">OpenAI ChatGPT</option>
                <option value="cursor">Cursor Agent</option>
                <option value="custom">Custom Node / CLI</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-relay-secondary font-medium">Model Designation</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-1.5-pro, claude-3-5-sonnet"
                className="w-full px-3 py-2 rounded-md bg-relay-elevated border border-relay-border text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-secondary transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-relay-subtle">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-md text-xs text-relay-muted hover:text-relay-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-3.5 py-1.5 rounded-md bg-relay-text hover:opacity-90 text-xs text-relay-canvas font-medium transition-colors disabled:opacity-40 shadow-sm"
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
