"use client";

import React, { useRef } from "react";
import { AudioLines } from "lucide-react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";

export const AudioInput: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const sendAudio = useRAGSessionStore((state) => state.sendAudio);
  const isSending = useRAGSessionStore((state) => state.isSending);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) await sendAudio(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={isSending}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 text-xs"
        title="Transcribe an audio recording with local Whisper"
      >
        <AudioLines className="w-4 h-4" />
        Upload audio
      </button>
    </>
  );
};
