import { SubQuery, ConflictInfo } from "./api";

export type EventCategory = 
  | "TRANSCRIPT"
  | "CONTROLLER"
  | "RETRIEVAL"
  | "LLM"
  | "GROUNDING"
  | "ANSWER"
  | "ERROR";

export interface TranscriptChunkEventMeta {
  text: string;
}

export interface ControllerDecisionEventMeta {
  decision: "WAIT" | "RETRIEVE" | "NO_RETRIEVE";
  confidence: number;
  reason: string;
}

export interface NoRetrieveEventMeta {
  reason: string;
}

export interface SubqueriesCreatedEventMeta {
  count: number;
  subqueries: SubQuery[];
}

export interface SearchStartedEventMeta {
  query: string;
  subquery_id: string;
}

export interface SearchCompletedEventMeta {
  subquery_id: string;
  results: number;
}

export interface RetrievalLatencyEventMeta {
  latency_ms: number;
  subquery_count: number;
}

export interface LLMUsageEventMeta {
  stage: "controller" | "decomposer" | "synthesis";
  model: string;
  latency_ms: number;
  usage?: Record<string, number>;
}

export interface LLMErrorEventMeta {
  stage: string;
  error_type: string;
  error: string;
}

export interface LLMDraftAcceptedEventMeta {
  citations: string[];
}

export interface LLMDraftRejectedEventMeta {
  invalid_citations?: string[];
  malformed_citations?: string[];
  uncited_lines?: number;
  reason?: string;
  unsupported_claims?: number;
}

export interface DeltaRetrievalStartedEventMeta {
  changed_text: string;
}

export interface DeltaRetrievalCompletedEventMeta {
  affected_claims: number;
  preserved_claims: number;
}

export interface AnswerGeneratedEventMeta {
  version: number;
}

export interface CitationValidatedEventMeta {
  valid: boolean;
  supported_claims: number;
  unsupported_claims: number;
  total_claims: number;
  grounding_rate: number;
  citations: string[];
  uncertainty: boolean;
  semantic_validation: boolean;
  mean_entailment_score: number | null;
  citation_integrity?: boolean;
  conflicts?: ConflictInfo[];
}

export type EventType =
  | "TRANSCRIPT_CHUNK"
  | "CONTROLLER_DECISION"
  | "NO_RETRIEVE"
  | "SUBQUERIES_CREATED"
  | "SEARCH_STARTED"
  | "SEARCH_COMPLETED"
  | "RETRIEVAL_LATENCY"
  | "LLM_USAGE"
  | "LLM_ERROR"
  | "LLM_DRAFT_ACCEPTED"
  | "LLM_DRAFT_REJECTED"
  | "DELTA_RETRIEVAL_STARTED"
  | "DELTA_RETRIEVAL_COMPLETED"
  | "ANSWER_GENERATED"
  | "CITATION_VALIDATED";

export interface BackendEvent {
  event_id: string;
  session_id: string;
  timestamp: string;
  event_type: EventType | string;
  metadata: Record<string, any>;
  category: EventCategory;
}
