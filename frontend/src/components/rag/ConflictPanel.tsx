"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { AlertOctagon, FileCode } from "lucide-react";

export const ConflictPanel: React.FC = () => {
  const conflicts = useRAGSessionStore((state) => state.conflicts);

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-amber-400 uppercase tracking-wider">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          Conflicting Policy Evidence Detected
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-bold">
          {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {conflicts.map((conflict, idx) => (
          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-amber-300 font-bold">Subquery: {conflict.subquery_id}</span>
              <span className="text-slate-400">{conflict.chunks?.length || 0} Sources</span>
            </div>

            {/* Cited chunks */}
            <div className="flex flex-wrap gap-1">
              {conflict.chunks?.map((chunkId) => (
                <span key={chunkId} className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700 rounded">
                  {chunkId}
                </span>
              ))}
            </div>

            {/* Differing policy numeric values */}
            {conflict.values && conflict.values.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] text-amber-400/80 font-medium">Contradictory Policy Values:</div>
                <div className="space-y-1 font-mono text-[11px]">
                  {conflict.values.map((valSet, vIdx) => (
                    <div key={vIdx} className="bg-slate-900/80 px-2 py-1 rounded text-amber-200 border border-slate-800">
                      • {valSet.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <p className="text-[11px] text-amber-300/80 italic">
          Backend intentionally fails closed and surfaces numeric uncertainty rather than guessing which policy version is correct.
        </p>
      </div>
    </div>
  );
};
