"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Layers, HelpCircle } from "lucide-react";

export const IntentPanel: React.FC = () => {
  const subqueries = useRAGSessionStore((state) => state.subqueries);

  if (!subqueries || subqueries.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
          <Layers className="w-4 h-4 text-indigo-400" />
          Multi-Intent Decomposition
        </div>
        <p className="text-slate-500">No sub-intents decomposed yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-indigo-400" />
          Multi-Intent Decomposition
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-semibold">
          {subqueries.length} Sub-query{subqueries.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {subqueries.map((q) => (
          <div
            key={q.id}
            className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1"
          >
            <div className="flex items-center justify-between font-mono">
              <span className="text-sky-400 font-bold">{q.id}</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700 capitalize">
                {q.intent}
              </span>
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed flex items-start gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>"{q.query}"</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
