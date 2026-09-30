"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

export const GroundingPanel: React.FC = () => {
  const grounding = useRAGSessionStore((state) => state.grounding);

  if (!grounding) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Claim-Level Grounding Validation
        </div>
        <p className="text-slate-500">No grounding validation performed yet.</p>
      </div>
    );
  }

  const groundingRatePct = Math.round(grounding.grounding_rate * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          {grounding.valid ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          )}
          Grounding Validation
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${
            grounding.valid
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {grounding.valid ? "✓ FULLY GROUNDED" : "⚠ UNCERTAIN / UNVERIFIED"}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Grounding rate progress bar */}
        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Grounding Rate ({grounding.supported_claims}/{grounding.total_claims} Claims)</span>
            <span className="font-semibold text-slate-200">{groundingRatePct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                groundingRatePct === 100 ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{ width: `${groundingRatePct}%` }}
            />
          </div>
        </div>

        {/* Validation Attributes */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Citation Integrity:</span>
            <span className={grounding.citation_integrity !== false ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {grounding.citation_integrity !== false ? "Valid" : "Invalid"}
            </span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Semantic NLI:</span>
            <span className={grounding.semantic_validation ? "text-sky-400 font-bold" : "text-slate-500"}>
              {grounding.semantic_validation ? "Enabled" : "Lexical"}
            </span>
          </div>
        </div>

        {/* Uncertainty Alert if present */}
        {grounding.uncertainty && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-amber-300 flex items-start gap-2 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Uncertainty Flagged:</span> One or more factual claims lack direct evidence grounding or citation integrity.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
