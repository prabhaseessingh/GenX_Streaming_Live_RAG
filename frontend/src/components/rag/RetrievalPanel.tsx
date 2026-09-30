"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Search, Clock, FileText } from "lucide-react";

export const RetrievalPanel: React.FC = () => {
  const eventHistory = useRAGSessionStore((state) => state.eventHistory);

  // Extract search metadata from events
  const searchStartedEvents = eventHistory.filter((e) => e.event_type === "SEARCH_STARTED");
  const searchCompletedEvents = eventHistory.filter((e) => e.event_type === "SEARCH_COMPLETED");
  const latencyEvents = eventHistory.filter((e) => e.event_type === "RETRIEVAL_LATENCY");

  const latestLatency = latencyEvents.length > 0 ? latencyEvents[latencyEvents.length - 1].metadata?.latency_ms : null;

  if (searchStartedEvents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
          <Search className="w-4 h-4 text-sky-400" />
          Parallel Retrieval
        </div>
        <p className="text-slate-500">No active retrieval events observed for this turn.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Search className="w-4 h-4 text-sky-400" />
          Parallel Retrieval
        </div>
        {latestLatency !== undefined && latestLatency !== null && (
          <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
            <Clock className="w-3 h-3" />
            {latestLatency} ms
          </div>
        )}
      </div>

      <div className="space-y-2 text-xs font-mono">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <div className="text-slate-500">Searches</div>
              <div className="font-semibold text-slate-200">{searchStartedEvents.length} executed</div>
            </div>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <div className="text-slate-500">Total Hits</div>
              <div className="font-semibold text-sky-400">
                {searchCompletedEvents.reduce((acc, ev) => acc + (ev.metadata?.results || 0), 0)} results
              </div>
            </div>
          </div>
        </div>

        {/* Per-subquery Search Hits */}
        <div className="space-y-1 pt-1">
          {searchCompletedEvents.slice(-4).map((ev) => (
            <div
              key={ev.event_id}
              className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80 text-[11px]"
            >
              <span className="text-slate-300 font-bold">{ev.metadata?.subquery_id}</span>
              <span className="text-slate-400 font-normal truncate max-w-[150px]">
                {ev.metadata?.query ? `"${ev.metadata.query}"` : ""}
              </span>
              <span className="text-emerald-400 font-semibold">{ev.metadata?.results} hit(s)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
