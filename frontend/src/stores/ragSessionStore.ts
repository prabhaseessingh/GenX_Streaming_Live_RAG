import { create } from "zustand";
import {
  RetrievalDecision,
  SubQuery,
  GroundingValidation,
  ConflictInfo,
  ChunkResponse,
  BackendHealth,
  BackendEventRaw,
  AudioResponse,
} from "@/types/api";
import {
  BackendEvent,
  LLMUsageEventMeta,
  SubqueriesCreatedEventMeta,
  CitationValidatedEventMeta,
  DeltaRetrievalCompletedEventMeta,
  LLMDraftRejectedEventMeta,
} from "@/types/events";
import { ConnectionStatus, RefinementState, ConversationTurn, FrontendError } from "@/types/session";
import { generateSessionId, getEventCategory } from "@/lib/utils";
import { ragApi, APIError } from "@/lib/api";

interface RAGSessionState {
  sessionId: string;
  connectionStatus: ConnectionStatus;
  connectionError?: string;

  turns: ConversationTurn[];
  cumulativeTranscript: string;

  latestResponse: ChunkResponse | null;
  decision: RetrievalDecision | null;
  answer: string;
  answerVersion: number;
  originalChunk: string;
  resolvedQuery: string | null;
  citations: string[];
  subqueries: SubQuery[];
  eventHistory: BackendEvent[];

  grounding: GroundingValidation | null;
  conflicts: ConflictInfo[];
  llmUsage: LLMUsageEventMeta[];
  llmDraftRejected: LLMDraftRejectedEventMeta | null;
  refinement: RefinementState | null;
  health: BackendHealth | null;

  isSending: boolean;
  pendingChunks: string[];
  isRefreshingEvents: boolean;
  isRefreshingHealth: boolean;
  error: FrontendError | null;

  developerMode: boolean;
  activeMobileTab: "chat" | "pipeline" | "telemetry" | "developer";

  // Actions
  hydrateSession: () => void;
  setSessionId: (id: string) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setActiveMobileTab: (tab: "chat" | "pipeline" | "telemetry" | "developer") => void;
  clearError: () => void;

  fetchHealth: () => Promise<void>;
  newSession: () => void;
  sendChunk: (text: string) => Promise<void>;
  sendAudio: (file: File) => Promise<void>;
  processChunkResponse: (response: ChunkResponse, chunkText: string) => void;
  fetchEventHistory: () => Promise<void>;
  reconcileEvents: (rawEvents: BackendEventRaw[]) => void;
  retryLastChunk: () => Promise<void>;
}

let processingChunk = false;

export const useRAGSessionStore = create<RAGSessionState>((set, get) => ({
  // The first render must be deterministic on both server and client. The
  // persisted browser session is restored after mount by hydrateSession().
  sessionId: "",
  connectionStatus: "DISCONNECTED",
  connectionError: undefined,

  turns: [],
  cumulativeTranscript: "",

  latestResponse: null,
  decision: null,
  answer: "",
  answerVersion: 0,
  originalChunk: "",
  resolvedQuery: null,
  citations: [],
  subqueries: [],
  eventHistory: [],

  grounding: null,
  conflicts: [],
  llmUsage: [],
  llmDraftRejected: null,
  refinement: null,
  health: null,

  isSending: false,
  pendingChunks: [],
  isRefreshingEvents: false,
  isRefreshingHealth: false,
  error: null,

  developerMode: false,
  activeMobileTab: "chat",

  hydrateSession: () => {
    if (typeof window === "undefined" || get().sessionId) return;

    const storedId = localStorage.getItem("rag_session_id");
    const sessionId = storedId || generateSessionId();
    localStorage.setItem("rag_session_id", sessionId);
    set({ sessionId });
  },

  setSessionId: (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rag_session_id", id);
    }
    set({ sessionId: id });
  },

  setConnectionStatus: (status: ConnectionStatus, error?: string) => {
    set({ connectionStatus: status, connectionError: error });
  },

  setDeveloperMode: (enabled: boolean) => {
    set({ developerMode: enabled });
  },

  setActiveMobileTab: (tab) => {
    set({ activeMobileTab: tab });
  },

  clearError: () => {
    set({ error: null });
  },

  fetchHealth: async () => {
    set({ isRefreshingHealth: true });
    try {
      const healthData = await ragApi.health();
      set({ health: healthData, isRefreshingHealth: false });
    } catch (err) {
      console.error("Health check failed:", err);
      set({
        isRefreshingHealth: false,
        error: {
          message: err instanceof APIError ? err.message : "Failed to fetch backend health status",
          timestamp: new Date().toISOString(),
          code: err instanceof APIError ? err.status : undefined,
        },
      });
    }
  },

  newSession: () => {
    const newId = generateSessionId();
    if (typeof window !== "undefined") {
      localStorage.setItem("rag_session_id", newId);
    }

    set({
      sessionId: newId,
      turns: [],
      cumulativeTranscript: "",
      latestResponse: null,
      decision: null,
      answer: "",
      answerVersion: 0,
      originalChunk: "",
      resolvedQuery: null,
      citations: [],
      subqueries: [],
      eventHistory: [],
      grounding: null,
      conflicts: [],
      llmUsage: [],
      llmDraftRejected: null,
      refinement: null,
      error: null,
      pendingChunks: [],
    });
  },

  sendChunk: async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    // Accept chunks continuously, but process them in order so one session
    // never has concurrent state mutations or out-of-order answers.
    if (processingChunk) {
      set((state) => ({ pendingChunks: [...state.pendingChunks, cleanText] }));
      return;
    }

    const startNextQueuedChunk = () => {
      const next = get().pendingChunks[0];
      if (!next) return;
      set((state) => ({ pendingChunks: state.pendingChunks.slice(1) }));
      void get().sendChunk(next);
    };

    processingChunk = true;
    set({ isSending: true, error: null });

    const newTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      timestamp: new Date().toISOString(),
      transcriptChunk: cleanText,
      isSending: true,
    };

    set((state) => ({
      turns: [...state.turns, newTurn],
      cumulativeTranscript: state.cumulativeTranscript ? `${state.cumulativeTranscript} ${cleanText}` : cleanText,
    }));

    try {
      const response = await ragApi.sendChunk(get().sessionId, cleanText);
      get().processChunkResponse(response, cleanText);
      await get().fetchEventHistory();
      processingChunk = false;
      startNextQueuedChunk();
    } catch (err) {
      console.error("Failed to send chunk:", err);
      const errorMessage = err instanceof APIError ? err.message : "Failed to process chunk. Backend endpoint error.";
      
      set((state) => ({
        isSending: false,
        error: {
          message: errorMessage,
          timestamp: new Date().toISOString(),
          code: err instanceof APIError ? err.status : undefined,
          retryable: true,
        },
        turns: state.turns.map((t) => (t.id === newTurn.id ? { ...t, isSending: false, error: errorMessage } : t)),
      }));
      processingChunk = false;
      startNextQueuedChunk();
    }
  },

  sendAudio: async (file: File) => {
    set({ isSending: true, error: null });
    try {
      const response: AudioResponse = await ragApi.sendAudio(get().sessionId, file);
      response.segments.forEach((segment) => {
        get().processChunkResponse(segment.result, segment.text);
        set((state) => ({
          turns: [...state.turns, {
            id: `audio_${segment.timestamp_s}_${segment.text}`,
            timestamp: new Date().toISOString(),
            transcriptChunk: segment.text,
            response: segment.result,
            decision: segment.result.decision,
            answer: segment.result.answer,
            version: segment.result.version,
            isSending: false,
          }],
          cumulativeTranscript: state.cumulativeTranscript ? `${state.cumulativeTranscript} ${segment.text}` : segment.text,
        }));
      });
      await get().fetchEventHistory();
      set({ isSending: false });
    } catch (err) {
      set({ isSending: false, error: {
        message: err instanceof APIError ? err.message : "Audio transcription failed",
        timestamp: new Date().toISOString(),
        code: err instanceof APIError ? err.status : undefined,
        retryable: false,
      }});
    }
  },

  processChunkResponse: (response: ChunkResponse, chunkText: string) => {
    const state = get();
    const updatedTurns = state.turns.map((t) => {
      if (t.transcriptChunk === chunkText && t.isSending) {
        return {
          ...t,
          isSending: false,
          response,
          decision: response.decision,
          answer: response.answer,
          version: response.version,
        };
      }
      return t;
    });

    set({
      isSending: false,
      latestResponse: response,
      decision: response.decision,
      answer: response.answer,
      answerVersion: response.version !== undefined ? response.version : state.answerVersion,
      originalChunk: response.transcript_chunk || chunkText || state.originalChunk,
      resolvedQuery: response.resolved_query ?? state.resolvedQuery,
      citations: response.citations || state.citations,
      turns: updatedTurns,
    });

    if (response.telemetry && response.telemetry.length > 0) {
      get().reconcileEvents(response.telemetry);
    }
  },

  fetchEventHistory: async () => {
    set({ isRefreshingEvents: true });
    try {
      const events = await ragApi.getEvents(get().sessionId);
      get().reconcileEvents(events);
      set({ isRefreshingEvents: false });
    } catch (err) {
      console.error("Failed to fetch events:", err);
      set({ isRefreshingEvents: false });
    }
  },

  reconcileEvents: (rawEvents: BackendEventRaw[]) => {
    const events: BackendEvent[] = rawEvents.map((e) => ({
      event_id: e.event_id,
      session_id: e.session_id,
      timestamp: e.timestamp,
      event_type: e.event_type,
      metadata: e.metadata || {},
      category: getEventCategory(e.event_type),
    }));

    let subqueries: SubQuery[] = [];
    let grounding: GroundingValidation | null = null;
    let conflicts: ConflictInfo[] = [];
    const llmUsage: LLMUsageEventMeta[] = [];
    let llmDraftRejected: LLMDraftRejectedEventMeta | null = null;
    let refinement: RefinementState | null = null;

    events.forEach((ev) => {
      if (ev.event_type === "SUBQUERIES_CREATED") {
        const meta = ev.metadata as SubqueriesCreatedEventMeta;
        if (meta && meta.subqueries) {
          subqueries = meta.subqueries;
        }
      } else if (ev.event_type === "CITATION_VALIDATED") {
        const meta = ev.metadata as CitationValidatedEventMeta;
        grounding = {
          valid: meta.valid,
          supported_claims: meta.supported_claims,
          unsupported_claims: meta.unsupported_claims,
          total_claims: meta.total_claims,
          grounding_rate: meta.grounding_rate,
          citations: meta.citations || [],
          uncertainty: meta.uncertainty,
          semantic_validation: meta.semantic_validation,
          mean_entailment_score: meta.mean_entailment_score,
          citation_integrity: meta.citation_integrity,
          conflicts: meta.conflicts,
        };
        if (meta.conflicts) {
          conflicts = meta.conflicts;
        }
      } else if (ev.event_type === "LLM_USAGE") {
        const meta = ev.metadata as LLMUsageEventMeta;
        if (meta && meta.stage) {
          llmUsage.push(meta);
        }
      } else if (ev.event_type === "LLM_DRAFT_REJECTED") {
        llmDraftRejected = ev.metadata as LLMDraftRejectedEventMeta;
      } else if (ev.event_type === "DELTA_RETRIEVAL_STARTED") {
        refinement = {
          isDelta: true,
          changedText: (ev.metadata as { changed_text?: string }).changed_text,
        };
      } else if (ev.event_type === "DELTA_RETRIEVAL_COMPLETED") {
        const meta = ev.metadata as DeltaRetrievalCompletedEventMeta;
        refinement = {
          isDelta: true,
          affectedClaims: meta.affected_claims,
          preservedClaims: meta.preserved_claims,
        };
      }
    });

    set({
      eventHistory: events,
      subqueries: subqueries.length > 0 ? subqueries : get().subqueries,
      grounding: grounding || get().grounding,
      conflicts: conflicts.length > 0 ? conflicts : get().conflicts,
      llmUsage,
      llmDraftRejected,
      refinement: refinement || get().refinement,
    });
  },

  retryLastChunk: async () => {
    const turns = get().turns;
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.transcriptChunk) {
      await get().sendChunk(lastTurn.transcriptChunk);
    }
  },
}));
