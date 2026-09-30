"use client";

import React, { useState } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { BackendEvent, EventCategory } from "@/types/events";
import { formatTimestamp } from "@/lib/utils";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Filter,
} from "lucide-react";

export const EventTimeline: React.FC = () => {
  const eventHistory = useRAGSessionStore((state) => state.eventHistory);
  const isRefreshingEvents = useRAGSessionStore((state) => state.isRefreshingEvents);
  const fetchEventHistory = useRAGSessionStore((state) => state.fetchEventHistory);

  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "ALL">("ALL");

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyJson = (event: BackendEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2)).then(() => {
      setCopiedEventId(event.event_id);
      setTimeout(() => setCopiedEventId(null), 2000);
    });
  };

  const getEventBadge = (eventType: string, category: EventCategory) => {
    switch (category) {
      case "TRANSCRIPT":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "CONTROLLER":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "RETRIEVAL":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "LLM":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "GROUNDING":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "ANSWER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "ERROR":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const filteredEvents = selectedCategory === "ALL" 
    ? eventHistory 
    : eventHistory.filter((e) => e.category === selectedCategory);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-indigo-400" />
          Backend Event Timeline ({eventHistory.length})
        </div>

        <button
          onClick={() => fetchEventHistory()}
          disabled={isRefreshingEvents}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800 transition-colors"
          title="Refresh session event history from GET /session/{id}/events"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshingEvents ? "animate-spin text-indigo-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1 pt-1 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
            selectedCategory === "ALL" ? "bg-indigo-600 text-white font-bold" : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          ALL ({eventHistory.length})
        </button>
        {(["TRANSCRIPT", "CONTROLLER", "RETRIEVAL", "LLM", "GROUNDING", "ANSWER", "ERROR"] as EventCategory[]).map((cat) => {
          const count = eventHistory.filter((e) => e.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                selectedCategory === cat ? "bg-indigo-600 text-white font-bold" : "bg-slate-950 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs font-mono">
          No backend events recorded for this session yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
          {filteredEvents.map((ev) => {
            const isExpanded = !!expandedEvents[ev.event_id];
            const badgeClass = getEventBadge(ev.event_type, ev.category);

            return (
              <div
                key={ev.event_id}
                className="bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden text-xs transition-colors hover:border-slate-700"
              >
                {/* Event Summary Row */}
                <div
                  onClick={() => toggleExpand(ev.event_id)}
                  className="flex items-center justify-between p-2.5 cursor-pointer select-none gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                      {formatTimestamp(ev.timestamp)}
                    </span>

                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded border font-semibold truncate ${badgeClass}`}>
                      {ev.event_type}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyJson(ev);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors flex-shrink-0"
                    title="Copy event JSON"
                  >
                    {copiedEventId === ev.event_id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expandable JSON Metadata */}
                {isExpanded && (
                  <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto space-y-2">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Event ID: {ev.event_id}</span>
                      <span>Session: {ev.session_id}</span>
                    </div>
                    <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                      {JSON.stringify(ev.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
