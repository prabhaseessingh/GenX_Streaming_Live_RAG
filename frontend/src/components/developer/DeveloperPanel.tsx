"use client";

import React, { useState } from "react";
import { CapabilityMatrix } from "./CapabilityMatrix";
import { RawResponseViewer } from "./RawResponseViewer";
import { EventTimeline } from "../telemetry/EventTimeline";
import { LLMUsagePanel } from "../telemetry/LLMUsagePanel";
import { HealthPanel } from "../telemetry/HealthPanel";
import { IntentPanel } from "../rag/IntentPanel";
import { RetrievalPanel } from "../rag/RetrievalPanel";
import { GroundingPanel } from "../rag/GroundingPanel";
import { ControllerCard } from "../rag/ControllerCard";
import { Terminal, Code2, Activity, Cpu, Layers } from "lucide-react";

export const DeveloperPanel: React.FC = () => {
  const [activeDevTab, setActiveDevTab] = useState<"telemetry" | "llm" | "raw" | "matrix">("telemetry");

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Developer View Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">
                Developer Observability Console
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded font-bold">
                DEV MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">Deep telemetry, raw JSON payloads, LLM stages & capability matrix</p>
          </div>
        </div>
      </div>

      {/* Backend System Health & Session ID */}
      <HealthPanel />

      {/* Developer Navigation Subtabs */}
      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveDevTab("telemetry")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
            activeDevTab === "telemetry"
              ? "bg-indigo-600 text-white font-bold shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Timeline
        </button>

        <button
          onClick={() => setActiveDevTab("llm")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
            activeDevTab === "llm"
              ? "bg-indigo-600 text-white font-bold shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          LLM & Safety
        </button>

        <button
          onClick={() => setActiveDevTab("raw")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
            activeDevTab === "raw"
              ? "bg-indigo-600 text-white font-bold shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Raw JSON
        </button>

        <button
          onClick={() => setActiveDevTab("matrix")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
            activeDevTab === "matrix"
              ? "bg-indigo-600 text-white font-bold shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Matrix
        </button>
      </div>

      {/* Tab 1: Event Timeline */}
      {activeDevTab === "telemetry" && (
        <div className="space-y-4 animate-fadeIn">
          <EventTimeline />
          <IntentPanel />
          <RetrievalPanel />
        </div>
      )}

      {/* Tab 2: LLM Stages & Safety Validation */}
      {activeDevTab === "llm" && (
        <div className="space-y-4 animate-fadeIn">
          <LLMUsagePanel />
          <ControllerCard />
          <GroundingPanel />
          <IntentPanel />
        </div>
      )}

      {/* Tab 3: Raw JSON Payloads */}
      {activeDevTab === "raw" && <RawResponseViewer />}

      {/* Tab 4: System Capability Matrix */}
      {activeDevTab === "matrix" && <CapabilityMatrix />}
    </div>
  );
};
