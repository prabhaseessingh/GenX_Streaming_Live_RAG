"use client";

import React, { useRef, useState } from "react";
import { Database, RefreshCw, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { ragApi, APIError } from "@/lib/api";
import { useRAGSessionStore } from "@/stores/ragSessionStore";

export const CorpusPanel: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchHealth = useRAGSessionStore((state) => state.fetchHealth);
  const health = useRAGSessionStore((state) => state.health);
  const [busy, setBusy] = useState<"upload" | "rebuild" | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const runOperation = async (operation: () => Promise<{ corpus_chunks: number }>, success: string) => {
    setError("");
    try {
      const result = await operation();
      setMessage(`${success} Corpus now contains ${result.corpus_chunks} chunks.`);
      await fetchHealth();
    } catch (err) {
      setMessage("");
      setError(err instanceof APIError ? err.detail : "Corpus operation failed. Check the backend and API key.");
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    setBusy("upload");
    await runOperation(() => ragApi.uploadCorpus(file), `${file.name} uploaded and indexed.`);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.md,.markdown,.txt,.json,application/pdf,application/json,text/plain,text/markdown"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) await upload(file);
          event.target.value = "";
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Database className="w-4 h-4 text-sky-400" />
          Corpus Management
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {health?.corpus_chunks !== undefined ? `${health.corpus_chunks} chunks` : "—"}
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Add a source document or rebuild the configured corpus. Retrieval reloads automatically after completion.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium disabled:opacity-50"
        >
          {busy === "upload" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload document
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setBusy("rebuild");
            void runOperation(() => ragApi.rebuildCorpus(), "Corpus rebuilt.");
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium disabled:opacity-50"
        >
          {busy === "rebuild" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Rebuild corpus
        </button>
      </div>

      {message && <div className="flex items-start gap-2 text-xs text-emerald-300"><CheckCircle2 className="w-4 h-4 shrink-0" />{message}</div>}
      {error && <div className="flex items-start gap-2 text-xs text-rose-300"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
    </section>
  );
};
