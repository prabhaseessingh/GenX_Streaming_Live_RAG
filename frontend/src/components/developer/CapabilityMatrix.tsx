"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Check, Info, Layers, Eye } from "lucide-react";

export const CapabilityMatrix: React.FC = () => {
  const eventHistory = useRAGSessionStore((state) => state.eventHistory);
  const health = useRAGSessionStore((state) => state.health);

  const eventTypesObserved = new Set(eventHistory.map((e) => e.event_type));

  const capabilities = [
    {
      name: "FastAPI REST API",
      endpoint: "/session/{id}/chunk, /health, /events",
      type: "Backend Core",
      observed: true,
    },
    {
      name: "WebSocket Real-time Stream",
      endpoint: "/ws/session/{id}",
      type: "Transport",
      observed: true,
    },
    {
      name: "Retrieval Controller",
      endpoint: "WAIT / RETRIEVE / NO_RETRIEVE",
      type: "Control Logic",
      observed: eventTypesObserved.has("CONTROLLER_DECISION"),
    },
    {
      name: "Multi-Intent Decomposition",
      endpoint: "SUBQUERIES_CREATED",
      type: "Decomposer",
      observed: eventTypesObserved.has("SUBQUERIES_CREATED"),
    },
    {
      name: "Parallel Hybrid Retrieval (BM25 + Lexical + Dense)",
      endpoint: "SEARCH_STARTED / SEARCH_COMPLETED",
      type: "Retrieval Engine",
      observed: eventTypesObserved.has("SEARCH_STARTED"),
    },
    {
      name: "Reciprocal Rank Fusion (RRF)",
      endpoint: "Rank aggregation",
      type: "Backend Internal Capability",
      observed: eventTypesObserved.has("SEARCH_COMPLETED"),
    },
    {
      name: "LLM Draft Synthesis (Groq)",
      endpoint: health?.llm_enabled ? "openai/gpt-oss-120b" : "Disabled",
      type: "LLM Provider",
      observed: eventTypesObserved.has("LLM_USAGE"),
    },
    {
      name: "Deterministic Grounded Fallback",
      endpoint: "Grounding synthesis",
      type: "Safety Guard",
      observed: eventTypesObserved.has("ANSWER_GENERATED"),
    },
    {
      name: "Claim-Level Evidence Validation",
      endpoint: "CITATION_VALIDATED",
      type: "Validation",
      observed: eventTypesObserved.has("CITATION_VALIDATED"),
    },
    {
      name: "Delta Retrieval & Refinement",
      endpoint: "DELTA_RETRIEVAL_COMPLETED",
      type: "Session Manager",
      observed: eventTypesObserved.has("DELTA_RETRIEVAL_COMPLETED"),
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-indigo-400" />
          Backend Capability Matrix vs Observed Events
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="py-2 px-2">Capability Name</th>
              <th className="py-2 px-2">Layer / Type</th>
              <th className="py-2 px-2">Backend Contract</th>
              <th className="py-2 px-2 text-right">Current Session Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-[11px]">
            {capabilities.map((cap, idx) => (
              <tr key={idx} className="hover:bg-slate-950/60">
                <td className="py-2 px-2 font-semibold text-slate-200">{cap.name}</td>
                <td className="py-2 px-2 text-slate-400">{cap.type}</td>
                <td className="py-2 px-2 text-slate-500 font-mono">{cap.endpoint}</td>
                <td className="py-2 px-2 text-right">
                  {cap.observed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Observed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      <Eye className="w-3 h-3 text-slate-500" /> Standby
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 italic">
        * Distinguishes verified static architecture from telemetry events observed in the active session.
      </p>
    </div>
  );
};
