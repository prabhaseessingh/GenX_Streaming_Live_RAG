"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Sliders, CheckCircle2, Clock, FastForward, Info } from "lucide-react";

export const ControllerCard: React.FC = () => {
  const decision = useRAGSessionStore((state) => state.decision);

  if (!decision) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
          <Sliders className="w-4 h-4 text-indigo-400" />
          Retrieval Controller
        </div>
        <p className="text-slate-500">Awaiting first transcript chunk to evaluate retrieval decision.</p>
      </div>
    );
  }

  const getDecisionStyle = (dec: string) => {
    switch (dec) {
      case "RETRIEVE":
        return {
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-400",
          icon: <CheckCircle2 className="w-4 h-4 text-sky-400" />,
          label: "RETRIEVE",
          desc: "Stable searchable intent confirmed. Executing parallel hybrid retrieval.",
        };
      case "NO_RETRIEVE":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <FastForward className="w-4 h-4 text-amber-400" />,
          label: "NO RETRIEVE",
          desc: "Presentation transformation requested. Transforming existing answer without new retrieval.",
        };
      case "WAIT":
      default:
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <Clock className="w-4 h-4 text-amber-400" />,
          label: "WAITING FOR CONTEXT",
          desc: "Transcript does not contain enough stable intent yet to perform reliable retrieval.",
        };
    }
  };

  const style = getDecisionStyle(decision.decision);
  const confidencePct = Math.round((decision.confidence || 0) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-indigo-400" />
          Retrieval Controller
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${style.bg}`}>
          {style.icon}
          {style.label}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {/* Confidence Meter */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
            <span>Confidence</span>
            <span className="font-semibold text-slate-200">{confidencePct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                decision.decision === "RETRIEVE"
                  ? "bg-sky-400"
                  : decision.decision === "NO_RETRIEVE"
                  ? "bg-amber-400"
                  : "bg-slate-500"
              }`}
              style={{ width: `${Math.max(5, confidencePct)}%` }}
            />
          </div>
        </div>

        {/* Reason / Intent details */}
        {decision.reason && (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
            <div className="flex items-start gap-1.5 text-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{decision.reason}</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-5">{style.desc}</p>
          </div>
        )}

        {/* Intent text if provided */}
        {decision.intent && decision.decision === "RETRIEVE" && (
          <div className="text-[11px] text-slate-400 font-mono truncate">
            <span className="text-slate-500">Intent:</span> "{decision.intent}"
          </div>
        )}
      </div>
    </div>
  );
};
