"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Cpu, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const LLMUsagePanel: React.FC = () => {
  const llmUsage = useRAGSessionStore((state) => state.llmUsage);
  const llmDraftRejected = useRAGSessionStore((state) => state.llmDraftRejected);
  const health = useRAGSessionStore((state) => state.health);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-purple-400" />
          LLM Execution & Draft Safety
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-mono rounded border font-semibold ${
            health?.llm_enabled
              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {health?.llm_enabled ? health.llm_model || "Groq Enabled" : "Deterministic Fallback Mode"}
        </span>
      </div>

      {/* LLM Stage Usage Calls */}
      {llmUsage.length > 0 ? (
        <div className="space-y-2">
          {llmUsage.map((usage, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-purple-300 font-bold capitalize">{usage.stage}</span>
                <div className="text-[10px] text-slate-500">{usage.model}</div>
              </div>

              <div className="text-right">
                <div className="text-sky-400 font-semibold">{usage.latency_ms} ms</div>
                {usage.usage && (
                  <div className="text-[10px] text-slate-400">
                    {usage.usage.total_tokens ? `${usage.usage.total_tokens} tokens` : "OK"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 font-mono">
          {health?.llm_enabled
            ? "No LLM calls recorded in the current turn stream."
            : "GROQ_API_KEY is not configured in backend. Deterministic grounded pipeline active."}
        </p>
      )}

      {/* Draft Acceptance / Rejection Status */}
      {llmDraftRejected && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-xs space-y-1.5 font-mono">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>LLM Draft Rejected by Backend Safety Guard</span>
          </div>

          <div className="text-[11px] text-rose-300 space-y-1 pl-5">
            {llmDraftRejected.reason && <div>Reason: <span className="font-bold">{llmDraftRejected.reason}</span></div>}
            {llmDraftRejected.invalid_citations && llmDraftRejected.invalid_citations.length > 0 && (
              <div>Invalid Citations: {llmDraftRejected.invalid_citations.join(", ")}</div>
            )}
            {llmDraftRejected.malformed_citations && llmDraftRejected.malformed_citations.length > 0 && (
              <div>Malformed Delimiters: {llmDraftRejected.malformed_citations.join(", ")}</div>
            )}
            {llmDraftRejected.uncited_lines !== undefined && llmDraftRejected.uncited_lines > 0 && (
              <div>Uncited Factual Lines: {llmDraftRejected.uncited_lines}</div>
            )}
            <div>Safety Fallback: <span className="text-emerald-400 font-bold">Deterministic Grounded Answer</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
