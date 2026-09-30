"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { RefreshCw, Check } from "lucide-react";

export const RefinementPanel: React.FC = () => {
  const refinement = useRAGSessionStore((state) => state.refinement);

  if (!refinement || !refinement.isDelta) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Session Refinement & Delta Retrieval
        </div>
        <p className="text-slate-500">Incremental turn. Standard session context active.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3 shadow-lg shadow-indigo-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300 uppercase tracking-wider">
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
          Delta Retrieval Completed
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded font-bold">
          Refinement Active
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {refinement.changedText && (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300">
            <span className="text-indigo-400 font-semibold">Constraint update:</span> "{refinement.changedText}"
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Affected Claims:</span>
            <span className="text-amber-400 font-bold">{refinement.affectedClaims ?? 0}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Preserved Claims:</span>
            <span className="text-emerald-400 font-bold">{refinement.preservedClaims ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1 font-mono">
          <Check className="w-3.5 h-3.5" />
          <span>Selective claim replacement executed. Old state preserved where unaffected.</span>
        </div>
      </div>
    </div>
  );
};
