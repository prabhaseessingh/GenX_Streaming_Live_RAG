"use client";

import React, { useRef, useEffect } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { AnswerPanel } from "./AnswerPanel";
import { TranscriptInput } from "./TranscriptInput";
import {
  MessageSquare,
  User,
  AlertTriangle,
  RefreshCw,
  Clock,
  FastForward,
} from "lucide-react";

export const ConversationPanel: React.FC = () => {
  const turns = useRAGSessionStore((state) => state.turns);
  const answer = useRAGSessionStore((state) => state.answer);
  const answerVersion = useRAGSessionStore((state) => state.answerVersion);
  const originalChunk = useRAGSessionStore((state) => state.originalChunk);
  const resolvedQuery = useRAGSessionStore((state) => state.resolvedQuery);
  const citations = useRAGSessionStore((state) => state.citations);
  const decision = useRAGSessionStore((state) => state.decision);
  const error = useRAGSessionStore((state) => state.error);
  const clearError = useRAGSessionStore((state) => state.clearError);
  const retryLastChunk = useRAGSessionStore((state) => state.retryLastChunk);
  const grounding = useRAGSessionStore((state) => state.grounding);
  const isSending = useRAGSessionStore((state) => state.isSending);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns, answer, isSending, error]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Scrollable Conversation Container */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Error Banner with Retry */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs space-y-2 text-rose-300 font-mono animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Backend Error Encountered</span>
              </div>
              <button
                onClick={clearError}
                className="text-slate-400 hover:text-slate-200 text-[10px]"
              >
                Dismiss ✕
              </button>
            </div>
            <p className="text-slate-200 leading-relaxed">{error.message}</p>
            {error.retryable && (
              <div className="pt-1">
                <button
                  onClick={retryLastChunk}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium py-1.5 px-3 rounded-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Failed Operation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {turns.length === 0 && !answer && (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3 bg-slate-950/40">
            <div className="w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-slate-200">No Transcript Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send your first transcript chunk below to initiate controller intent evaluation and parallel hybrid retrieval.
              </p>
            </div>
          </div>
        )}

        {/* Conversation Turns List */}
        {turns.map((turn, idx) => (
          <div key={turn.id || idx} className="space-y-3">
            {/* User Chunk Message */}
            <div className="flex items-start gap-3 justify-end">
              <div className="max-w-[85%] bg-indigo-600/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm p-3.5 text-slate-100 text-sm shadow-md">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 font-semibold mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Transcript Chunk #{idx + 1}</span>
                  {turn.response?.source === "asr" && turn.response.timestamp_s !== null && turn.response.timestamp_s !== undefined && (
                    <span className="text-slate-500">· {turn.response.timestamp_s.toFixed(1)}s</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{turn.transcriptChunk}</p>
              </div>
            </div>

            {/* Decision or Answer Response */}
            {turn.decision && turn.decision.decision === "WAIT" && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-1">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl rounded-tl-sm p-3.5 text-amber-200 text-xs font-mono space-y-1 max-w-[85%]">
                  <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>WAITING FOR STABLE CONTEXT</span>
                  </div>
                  <p className="text-amber-300/90 leading-relaxed">
                    {turn.decision.reason || "The current transcript chunk does not contain enough stable intent to trigger retrieval."}
                  </p>
                </div>
              </div>
            )}

            {turn.decision && turn.decision.decision === "NO_RETRIEVE" && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-1">
                  <FastForward className="w-4 h-4" />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl rounded-tl-sm p-3.5 text-amber-200 text-xs font-mono space-y-1 max-w-[85%]">
                  <div className="font-bold uppercase tracking-wider">NO RETRIEVE — PRESENTATION TRANSFORMATION</div>
                  <p className="text-amber-300/90 leading-relaxed">
                    Existing answer transformed without executing a new retrieval search.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Latest Active Answer Display */}
        {answer && (
          <div className="pt-2 animate-fadeIn">
            <AnswerPanel
              answer={answer}
              version={answerVersion}
              citations={citations}
              hasUncertainty={grounding?.uncertainty}
              originalChunk={originalChunk}
              resolvedQuery={resolvedQuery}
            />
          </div>
        )}

        {/* Smooth Auto-Scroll Bottom Target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Bottom Input Area */}
      <div className="sticky bottom-0 pt-2 bg-slate-950">
        <TranscriptInput />
      </div>
    </div>
  );
};
