"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Parse message into blocks: code blocks vs text blocks
  const blocks = React.useMemo(() => {
    const result: Array<{ type: "code" | "text"; content: string; language?: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      result.push({
        type: "code",
        language: match[1] || "plaintext",
        content: match[2].trimEnd(),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      result.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content]);

  return (
    <div className={`space-y-2.5 text-xs text-relay-text ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return (
            <CodeBlock
              key={idx}
              language={block.language || "text"}
              code={block.content}
            />
          );
        }
        return <TextBlock key={idx} content={block.content} />;
      })}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg border border-relay-border bg-[#0d1117] overflow-hidden shadow-sm">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-relay-border/60 text-[11px] select-none">
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono font-medium">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="uppercase text-[10px] tracking-wider font-semibold text-zinc-300">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-zinc-200">
        <pre className="!bg-transparent !p-0 !border-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function TextBlock({ content }: { content: string }) {
  // Split into lines to handle lists, blockquotes, and normal paragraphs
  const lines = content.split("\n");

  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-2" />;
        }

        // Blockquote
        if (line.startsWith("> ")) {
          return (
            <div
              key={lIdx}
              className="border-l-2 border-indigo-500/60 pl-3 py-0.5 text-relay-muted italic text-[11.5px]"
            >
              <InlineText text={line.slice(2)} />
            </div>
          );
        }

        // Bullet list
        if (line.match(/^[-*]\s+/)) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-relay-muted font-bold text-sm leading-4">•</span>
              <div className="flex-1">
                <InlineText text={line.replace(/^[-*]\s+/, "")} />
              </div>
            </div>
          );
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-relay-muted font-mono text-[11px] leading-4">
                {numMatch[1]}.
              </span>
              <div className="flex-1">
                <InlineText text={line.slice(numMatch[0].length)} />
              </div>
            </div>
          );
        }

        // Regular paragraph line
        return (
          <p key={lIdx} className="break-words">
            <InlineText text={line} />
          </p>
        );
      })}
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  // Process inline markdown: mentions (@handle), inline code (`code`), bold (**bold**), links ([text](url))
  // Regex tokenization
  const tokens = React.useMemo(() => {
    const regex = /(@[\w-]+)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const raw = match[0];
      if (raw.startsWith("@")) {
        // Mention badge
        const isEveryone = raw.toLowerCase() === "@everyone";
        parts.push(
          <span
            key={match.index}
            className={`inline-flex items-center px-1.5 py-0.2 rounded font-medium text-[11px] mx-0.5 border ${
              isEveryone
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono"
            }`}
          >
            {raw}
          </span>
        );
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        // Inline code
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-relay-surface border border-relay-border font-mono text-[11px] text-indigo-400 dark:text-indigo-300"
          >
            {raw.slice(1, -1)}
          </code>
        );
      } else if (raw.startsWith("**") && raw.endsWith("**")) {
        // Bold
        parts.push(
          <strong key={match.index} className="font-semibold text-relay-text">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith("*") && raw.endsWith("*")) {
        // Italic
        parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
      } else if (raw.startsWith("[")) {
        // Link [label](url)
        const linkMatch = raw.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={match.index}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition-colors"
            >
              {linkMatch[1]}
            </a>
          );
        } else {
          parts.push(raw);
        }
      }

      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [text]);

  return <>{tokens}</>;
}
