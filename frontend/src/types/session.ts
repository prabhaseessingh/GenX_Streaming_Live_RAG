import {
  RetrievalDecision,
  SubQuery,
  GroundingValidation,
  ConflictInfo,
  ChunkResponse,
  BackendHealth,
} from "./api";
import { BackendEvent, LLMUsageEventMeta } from "./events";

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "ERROR";

export interface RefinementState {
  isDelta: boolean;
  changedText?: string;
  affectedClaims?: number;
  preservedClaims?: number;
}

export interface ConversationTurn {
  id: string;
  timestamp: string;
  transcriptChunk: string;
  response?: ChunkResponse;
  decision?: RetrievalDecision;
  answer?: string;
  version?: number;
  isSending?: boolean;
  error?: string;
}

export interface FrontendError {
  code?: number;
  message: string;
  timestamp: string;
  retryable?: boolean;
}
