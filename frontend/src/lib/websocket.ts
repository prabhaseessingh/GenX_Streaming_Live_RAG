import { ChunkResponse } from "@/types/api";
import { ConnectionStatus } from "@/types/session";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws") : "ws://127.0.0.1:8000");

function getApiKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("rag_api_key") || process.env.NEXT_PUBLIC_API_KEY || null;
  }
  return process.env.NEXT_PUBLIC_API_KEY || null;
}

export type MessageHandler = (data: ChunkResponse) => void;
export type StatusHandler = (status: ConnectionStatus, error?: string) => void;

export class RAGWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private onMessageCallback: MessageHandler | null = null;
  private onStatusCallback: StatusHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  constructor(onMessage?: MessageHandler, onStatus?: StatusHandler) {
    if (onMessage) this.onMessageCallback = onMessage;
    if (onStatus) this.onStatusCallback = onStatus;
  }

  public connect(sessionId: string) {
    if (this.socket && this.sessionId === sessionId && 
       (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.disconnect();

    this.sessionId = sessionId;
    this.isIntentionallyClosed = false;
    this.notifyStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");

    let url = `${WS_BASE_URL}/ws/session/${encodeURIComponent(sessionId)}`;
    const apiKey = getApiKey();
    if (apiKey) {
      url += `?api_key=${encodeURIComponent(apiKey)}`;
    }

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus("CONNECTED");
      };

      this.socket.onmessage = (event) => {
        try {
          const data: ChunkResponse = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (err) {
          console.warn("Failed to parse WebSocket JSON message:", err);
        }
      };

      this.socket.onerror = () => {
        // Handle WS error gracefully without verbose console floods
        this.notifyStatus("ERROR", "WebSocket transport unavailable (Server WS upgrade not supported or active). HTTP mode fallback active.");
      };

      this.socket.onclose = (event) => {
        if (event.code === 1008) {
          this.notifyStatus("ERROR", "Authentication failed (1008). Invalid or missing API key.");
          return;
        }

        if (!this.isIntentionallyClosed) {
          this.notifyStatus("DISCONNECTED");
          this.scheduleReconnect();
        } else {
          this.notifyStatus("DISCONNECTED");
        }
      };
    } catch {
      this.notifyStatus("ERROR", "WebSocket connection attempt failed. Operating in HTTP mode.");
      this.scheduleReconnect();
    }
  }

  public sendChunk(text: string): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ text }));
      return true;
    }
    return false;
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore close errors
      }
      this.socket = null;
    }
    this.notifyStatus("DISCONNECTED");
  }

  public reconnect() {
    if (this.sessionId) {
      this.reconnectAttempts = 0;
      this.connect(this.sessionId);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyStatus("DISCONNECTED", "WebSocket unavailable. System operating via HTTP REST API.");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(2000 * this.reconnectAttempts, 8000);

    this.reconnectTimer = setTimeout(() => {
      if (this.sessionId && !this.isIntentionallyClosed) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  private notifyStatus(status: ConnectionStatus, error?: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status, error);
    }
  }
}
