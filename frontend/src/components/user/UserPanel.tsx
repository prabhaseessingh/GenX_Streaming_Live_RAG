"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { ControllerCard } from "../rag/ControllerCard";
import { GroundingPanel } from "../rag/GroundingPanel";
import { ConflictPanel } from "../rag/ConflictPanel";
import { RefinementPanel } from "../rag/RefinementPanel";
import { CitationList } from "../conversation/CitationList";
import { IntentPanel } from "../rag/IntentPanel";
import { RetrievalPanel } from "../rag/RetrievalPanel";
import { HealthPanel } from "../telemetry/HealthPanel";
import { CorpusPanel } from "../corpus/CorpusPanel";
import { Sparkles, ShieldCheck, FileText } from "lucide-react";

export const UserPanel: React.FC = () => {
  const citations = useRAGSessionStore((state) => state.citations);
  const grounding = useRAGSessionStore((state) => state.grounding);
  const conflicts = useRAGSessionStore((state) => state.conflicts);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* User View Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                User Verification View
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                USER MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">Unified view of factual grounding, pipeline decisions & document citations</p>
          </div>
        </div>

        {grounding?.valid ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Grounded
          </span>
        ) : (
          conflicts && conflicts.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-semibold">
              Conflict Warning
            </span>
          )
        )}
      </div>

      {/* System Corpus & LLM Status */}
      <HealthPanel />

      {/* Corpus upload and rebuild controls */}
      <CorpusPanel />

      {/* 1. Retrieval Controller Decision */}
      <ControllerCard />

      {/* 2. Conflicting Evidence Alert (if present) */}
      <ConflictPanel />

      {/* 3. Grounding Validation & Entailment */}
      <GroundingPanel />

      {/* 4. Intent Analysis & Subquery Decomposition */}
      <IntentPanel />

      {/* 5. Retrieved Evidence Chunks */}
      <RetrievalPanel />

      {/* 6. Refinement & Delta Updates */}
      <RefinementPanel />

      {/* 7. Document Citations */}
      {citations && citations.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-indigo-400" />
            Document Citations ({citations.length})
          </div>
          <CitationList citations={citations} />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300 mb-1">
            <FileText className="w-4 h-4 text-slate-500" />
            Document Citations
          </div>
          <p className="text-slate-500">Citations will appear here after evidence is retrieved and validated.</p>
        </div>
      )}
    </div>
  );
};
