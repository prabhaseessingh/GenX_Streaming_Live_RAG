"use client";

import React, { useState } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { ConnectionStatusBadge } from "./ConnectionStatus";
import {
  Copy,
  Check,
  PlusCircle,
  Terminal,
  MessageSquare,
  Activity,
  SlidersHorizontal,
  Code2,
  Database,
  UserCheck,
} from "lucide-react";

export const Header: React.FC = () => {
  const sessionId = useRAGSessionStore((state) => state.sessionId);
  const health = useRAGSessionStore((state) => state.health);
  const newSession = useRAGSessionStore((state) => state.newSession);
  const developerMode = useRAGSessionStore((state) => state.developerMode);
  const setDeveloperMode = useRAGSessionStore((state) => state.setDeveloperMode);
  const activeMobileTab = useRAGSessionStore((state) => state.activeMobileTab);
  const setActiveMobileTab = useRAGSessionStore((state) => state.setActiveMobileTab);

  const [copiedSessionId, setCopiedSessionId] = useState(false);

  const handleCopySessionId = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    }).catch((err) => console.error("Clipboard copy failed:", err));
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-colors">
      <div className="max-w-[1700px] mx-auto px-4 py-3">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4">
          {/* App Title & Subtitle with GenX Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-transparent flex-shrink-0">
              <img src="/logo.png" alt="GenX Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  GenX Streaming Live RAG
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Streaming Live RAG Control Room & Observability Console
              </p>
            </div>
          </div>

          {/* System Mode & Health Status */}
          <div className="hidden lg:flex items-center gap-3">
            {health && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Corpus:</span>
                <span className="text-indigo-400 font-semibold">{health.corpus_chunks} chunks</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">LLM:</span>
                {health.llm_enabled ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {health.llm_model || "Enabled"}
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">Deterministic</span>
                )}
              </div>
            )}
            <ConnectionStatusBadge />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Session ID Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-xs font-mono text-slate-300">
              <span className="text-slate-500">ID:</span>
              <span className="max-w-[100px] truncate">{sessionId}</span>
              <button
                onClick={handleCopySessionId}
                className="text-slate-400 hover:text-slate-100 p-0.5 rounded transition-colors"
                title="Copy Session ID"
              >
                {copiedSessionId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* New Session CTA */}
            <button
              onClick={newSession}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium shadow-sm"
              title="Start a new session ID"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">New Session</span>
            </button>

            {/* Interactive Switch-Type Mode Toggle */}
            <button
              onClick={() => setDeveloperMode(!developerMode)}
              className={`flex items-center gap-2.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-300 font-mono shadow-sm cursor-pointer select-none ${
                developerMode
                  ? "bg-indigo-950/70 border-indigo-500/60 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                  : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-slate-100"
              }`}
              title={developerMode ? "Switch to User Mode" : "Switch to Developer Mode"}
            >
              <div className="flex items-center gap-1.5">
                {developerMode ? (
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-semibold">
                  {developerMode ? "Developer Mode ON" : "Switch to Developer Mode"}
                </span>
              </div>

              {/* Sliding Switch Pill Track */}
              <div
                className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${
                  developerMode ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                {/* Sliding Knob */}
                <div
                  className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    developerMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Subheader Navigation Bar */}
        <div className="flex lg:hidden items-center justify-between pt-2.5 mt-2 border-t border-slate-800/60">
          <ConnectionStatusBadge />
          
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMobileTab("chat")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                activeMobileTab === "chat" ? "bg-indigo-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              Chat
            </button>
            <button
              onClick={() => setActiveMobileTab("pipeline")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                activeMobileTab === "pipeline" ? "bg-indigo-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Pipeline
            </button>
            <button
              onClick={() => setActiveMobileTab("telemetry")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                activeMobileTab === "telemetry" ? "bg-indigo-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setActiveMobileTab("developer")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                activeMobileTab === "developer" ? "bg-indigo-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              <Code2 className="w-3 h-3" />
              Dev
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
