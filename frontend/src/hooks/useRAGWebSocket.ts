import { useEffect, useRef, useCallback } from "react";
import { useRAGSessionStore } from "@/stores/ragSessionStore";
import { RAGWebSocketClient } from "@/lib/websocket";
import { ChunkResponse } from "@/types/api";

export function useRAGWebSocket() {
  const sessionId = useRAGSessionStore((state) => state.sessionId);
  const setConnectionStatus = useRAGSessionStore((state) => state.setConnectionStatus);
  const processChunkResponse = useRAGSessionStore((state) => state.processChunkResponse);
  const fetchEventHistory = useRAGSessionStore((state) => state.fetchEventHistory);

  const clientRef = useRef<RAGWebSocketClient | null>(null);

  const handleMessage = useCallback((data: ChunkResponse) => {
    processChunkResponse(data, "");
    fetchEventHistory();
  }, [processChunkResponse, fetchEventHistory]);

  const handleStatus = useCallback((status: any, error?: string) => {
    setConnectionStatus(status, error);
  }, [setConnectionStatus]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (!clientRef.current) {
      clientRef.current = new RAGWebSocketClient(handleMessage, handleStatus);
    }

    if (sessionId) {
      clientRef.current.connect(sessionId);
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [sessionId, handleMessage, handleStatus]);

  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.reconnect();
    }
  }, []);

  const sendChunkWS = useCallback((text: string): boolean => {
    if (clientRef.current) {
      return clientRef.current.sendChunk(text);
    }
    return false;
  }, []);

  return {
    reconnect,
    sendChunkWS,
  };
}
