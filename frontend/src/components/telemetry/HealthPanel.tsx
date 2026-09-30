"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { Database, Server, RefreshCw, Cpu } from "lucide-react";

export const HealthPanel: React.FC = () => {
  const { health, isRefreshingHealth, refreshHealth } = useBackendHealth();
  const connectionStatus = useRAGSessionStore((state) => state.connectionStatus);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Server className="w-4 h-4 text-emerald-400" />
          Backend System Health
        </div>

        <button
          onClick={() => refreshHealth()}
          disabled={isRefreshingHealth}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800 transition-colors"
          title="Refresh health status"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshingHealth ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Server className="w-3 h-3 text-slate-400" />
            Backend Status
          </div>
          <div className="font-bold flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {health?.status ? health.status.toUpperCase() : connectionStatus}
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Database className="w-3 h-3 text-slate-400" />
            Corpus Chunks
          </div>
          <div className="font-bold text-sky-400">
            {health?.corpus_chunks !== undefined ? `${health.corpus_chunks} chunks` : "—"}
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            Active LLM
          </div>
          <div className="font-bold text-purple-400 truncate">
            {health?.llm_enabled ? health.llm_model || "Enabled" : "Deterministic"}
          </div>
        </div>
      </div>
    </div>
  );
};
