import { AudioResponse, BackendHealth, ChunkResponse, BackendEventRaw, CorpusOperationResponse } from "@/types/api";

const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api/rag";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

function getApiKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("rag_api_key") || process.env.NEXT_PUBLIC_API_KEY || null;
  }
  return process.env.NEXT_PUBLIC_API_KEY || null;
}

export class APIError extends Error {
  status: number;
  detail: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.detail = detail || message;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const apiKey = getApiKey();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errorJson = await response.json();
        detail = errorJson.detail || errorJson.message || response.statusText;
      } catch {
        detail = response.statusText;
      }

      if (response.status === 401) {
        throw new APIError(401, "Authentication required. Missing or invalid API key.", detail);
      } else if (response.status === 429) {
        throw new APIError(429, "Rate limit exceeded. Please wait before sending more requests.", detail);
      } else if (response.status >= 500) {
        throw new APIError(response.status, "The backend server encountered an error while processing the request.", detail);
      } else {
        throw new APIError(response.status, `Request failed with status ${response.status}`, detail);
      }
    }

    return response;
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError(0, "Failed to connect to backend service. Ensure FastAPI server is running at http://127.0.0.1:8000.", err instanceof Error ? err.message : String(err));
  }
}

export const ragApi = {
  async health(): Promise<BackendHealth> {
    const res = await fetchWithAuth("/health");
    return await res.json();
  },

  async sendChunk(sessionId: string, text: string): Promise<ChunkResponse> {
    const res = await fetchWithAuth(`/session/${encodeURIComponent(sessionId)}/chunk`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return await res.json();
  },

  async getEvents(sessionId: string): Promise<BackendEventRaw[]> {
    const res = await fetchWithAuth(`/session/${encodeURIComponent(sessionId)}/events`);
    return await res.json();
  },

  async sendAudio(sessionId: string, file: File): Promise<AudioResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetchWithAuth(`/session/${encodeURIComponent(sessionId)}/audio`, {
      method: "POST",
      body: form,
    });
    return await res.json();
  },

  async uploadCorpus(file: File): Promise<CorpusOperationResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetchWithAuth("/corpus/upload", { method: "POST", body: form });
    return await res.json();
  },

  async rebuildCorpus(): Promise<CorpusOperationResponse> {
    const res = await fetchWithAuth("/corpus/rebuild", { method: "POST" });
    return await res.json();
  },
};
