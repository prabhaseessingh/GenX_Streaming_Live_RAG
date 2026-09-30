"use client";

import React, { useState } from "react";
import { CitationList } from "./CitationList";
import { Copy, Check, Sparkles, AlertTriangle } from "lucide-react";

interface AnswerPanelProps {
  answer: string;
  version?: number;
  citations?: string[];
  hasUncertainty?: boolean;
  originalChunk?: string;
  resolvedQuery?: string | null;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({
  answer,
  citations = [],
  hasUncertainty = false,
  originalChunk = "",
  resolvedQuery = null,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => console.error("Copy failed:", err));
  };

  // Replace [DOC_...] in answer with visually distinct elements while rendering
  const renderFormattedAnswer = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      if (!line.trim()) return <div key={lIdx} className="h-2" />;

      // Parse citation bracket markers
      const parts = line.split(/(\[[A-Za-z0-9_]+\])/g);

      const content = parts.map((part, pIdx) => {
        if (/^\[[A-Za-z0-9_]+\]$/.test(part)) {
          return (
            <span
              key={pIdx}
              className="inline-flex items-center px-1.5 py-0.5 mx-1 text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded font-semibold cursor-pointer hover:bg-indigo-900 transition-colors"
            >
              {part}
            </span>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });

      if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        return (
          <li key={lIdx} className="ml-4 list-disc text-slate-200 leading-relaxed py-0.5">
            {content}
          </li>
        );
      }

      return (
        <p key={lIdx} className="text-slate-200 leading-relaxed py-1">
          {content}
        </p>
      );
    });
  };

  if (!answer) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
      {/* Answer Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Grounded Assistant Response
            </h3>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors font-mono"
          title="Copy exact response text to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? "Copied" : "Copy Answer"}</span>
        </button>
      </div>

      {/* Uncertainty Alert Banner */}
      {hasUncertainty && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300 flex items-start gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Potentially Conflicting Policy Values:</span> Review the cited sources carefully before taking action.
          </div>
        </div>
      )}

      {/* Answer Content */}
      {originalChunk && resolvedQuery && originalChunk.trim() !== resolvedQuery.trim() && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
          <div className="text-slate-400 font-mono uppercase tracking-wide">Context-aware query interpretation</div>
          <div className="text-slate-300"><span className="text-slate-500">Latest chunk:</span> {originalChunk}</div>
          <div className="text-indigo-300"><span className="text-slate-500">Resolved query:</span> {resolvedQuery}</div>
        </div>
      )}
      <div className="text-sm space-y-1 font-sans">
        {renderFormattedAnswer(answer)}
      </div>

      {/* Citations Footer */}
      {citations.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80">
          <CitationList citations={citations} />
        </div>
      )}
    </div>
  );
};
