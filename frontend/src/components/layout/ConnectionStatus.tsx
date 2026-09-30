"use client";

import React from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { useRAGWebSocket } from "@/hooks/useRAGWebSocket";
import { Wifi, RefreshCw, Server } from "lucide-react";

export const ConnectionStatusBadge: React.FC = () => {
  const connectionStatus = useRAGSessionStore((state) => state.connectionStatus);
  const connectionError = useRAGSessionStore((state) => state.connectionError);
  const { reconnect } = useRAGWebSocket();

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case "CONNECTED":
        return {
          label: "WebSocket Stream",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dotClass: "bg-emerald-500 animate-pulse",
          icon: <Wifi className="w-3.5 h-3.5" />,
        };
      case "CONNECTING":
        return {
          label: "Connecting WS...",
          badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          dotClass: "bg-sky-400 animate-ping",
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
        };
      case "RECONNECTING":
        return {
          label: "Reconnecting WS...",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dotClass: "bg-amber-400 animate-pulse",
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
        };
      case "ERROR":
      case "DISCONNECTED":
      default:
        return {
          label: "HTTP REST API",
          badgeClass: "bg-slate-800 text-sky-300 border-slate-700",
          dotClass: "bg-sky-400",
          icon: <Server className="w-3.5 h-3.5 text-sky-400" />,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 px-3 py-1 text-xs font-mono rounded-full border ${statusInfo.badgeClass} transition-colors`}
        title={connectionError || `Transport Mode: ${statusInfo.label}`}
      >
        <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
        <span className="font-medium">{statusInfo.label}</span>
      </div>

      {connectionStatus !== "CONNECTED" && connectionStatus !== "CONNECTING" && (
        <button
          onClick={reconnect}
          className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md transition-colors font-mono"
          title="Try WebSocket Reconnection"
        >
          <RefreshCw className="w-3 h-3" />
          WS Connect
        </button>
      )}
    </div>
  );
};
