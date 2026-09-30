"use client";

import React, { useState } from "react";
import { FileText, Info, ExternalLink } from "lucide-react";

interface CitationListProps {
  citations: string[];
}

export const CitationList: React.FC<CitationListProps> = ({ citations }) => {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  if (!citations || citations.length === 0) {
    return (
      <div className="text-xs text-slate-500 font-mono italic">
        No citations attached to current answer.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <FileText className="w-3.5 h-3.5 text-indigo-400" />
        Verified Grounding Citations ({citations.length})
      </div>

      <div className="flex flex-wrap gap-1.5">
        {citations.map((docId) => (
          <button
            key={docId}
            onClick={() => setSelectedCitation(selectedCitation === docId ? null : docId)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all flex items-center gap-1 ${
              selectedCitation === docId
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md scale-105"
                : "bg-slate-900 hover:bg-slate-800 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/60"
            }`}
          >
            <span>[{docId}]</span>
          </button>
        ))}
      </div>

      {/* Selected Citation Detail Modal/Popover */}
      {selectedCitation && (
        <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/40 text-xs font-mono space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400 font-bold">Citation Identifier: {selectedCitation}</span>
            <button
              onClick={() => setSelectedCitation(null)}
              className="text-slate-400 hover:text-slate-200 text-[10px]"
            >
              Close ✕
            </button>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Source document chunk <code className="text-indigo-300">[{selectedCitation}]</code> was retrieved by the backend hybrid retriever and validated for claim grounding.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Note: Full raw source document text is managed by the backend corpus storage.</span>
          </div>
        </div>
      )}
    </div>
  );
};
