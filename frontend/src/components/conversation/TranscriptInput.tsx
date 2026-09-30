"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Send, CornerDownLeft, X, Loader2 } from "lucide-react";
import { AudioInput } from "./AudioInput";

export const TranscriptInput: React.FC = () => {
  const [text, setText] = useState("");
  const isSending = useRAGSessionStore((state) => state.isSending);
  const pendingChunks = useRAGSessionStore((state) => state.pendingChunks);
  const sendChunk = useRAGSessionStore((state) => state.sendChunk);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount and whenever sending completes
  useEffect(() => {
    if (!isSending) {
      textareaRef.current?.focus();
    }
  }, [isSending]);

  const handleSubmit = async () => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendChunk(cleanText);

    // Keep focus in chatbox immediately
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl space-y-2">
      <div className="relative flex items-center">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type or paste transcript chunk (e.g. 'What are the foreign currency reimbursement rules?')..."
          rows={2}
          autoFocus
          className="w-full bg-slate-950 text-slate-100 text-sm placeholder-slate-500 rounded-lg p-3 pr-10 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none disabled:opacity-50"
        />

          {text && (
          <button
            onClick={() => {
              setText("");
              textareaRef.current?.focus();
            }}
            className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
            title="Clear input"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Press Enter to send chunk • Shift+Enter for new line</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <AudioInput />
          {text.trim() && (
            <button
              onClick={() => {
                setText("");
                textareaRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            >
              Clear
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs transition-all shadow-md ${
              !text.trim()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-indigo-600/20 active:scale-95"
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{pendingChunks.length ? `Processing · ${pendingChunks.length} queued` : "Processing Chunk..."}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Chunk</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
