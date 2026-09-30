"use client";

import React, { useState } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { Code2, Copy, Check } from "lucide-react";

export const RawResponseViewer: React.FC = () => {
  const latestResponse = useRAGSessionStore((state) => state.latestResponse);
  const [copied, setCopied] = useState(false);

  const jsonString = latestResponse ? JSON.stringify(latestResponse, null, 2) : "// No HTTP/WS chunk response received yet.";

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          <Code2 className="w-4 h-4 text-indigo-400" />
          Raw Latest Backend Response Payload
        </div>

        <button
          onClick={handleCopy}
          disabled={!latestResponse}
          className="flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors font-mono"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? "Copied" : "Copy JSON"}</span>
        </button>
      </div>

      <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-[350px]">
        {jsonString}
      </pre>
    </div>
  );
};
