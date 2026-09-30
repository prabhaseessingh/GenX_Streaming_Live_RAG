export type DecisionType = "WAIT" | "RETRIEVE" | "NO_RETRIEVE";

export interface RetrievalDecision {
  decision: DecisionType;
  confidence: number;
  intent: string;
  reason: string;
  changed_information: string[];
}

export interface SubQuery {
  id: string;
  intent: string;
  query: string;
  priority: number;
}

export interface GroundingValidation {
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

export interface ConflictInfo {
  subquery_id: string;
  chunks: string[];
  values: string[][];
}

export interface ChunkResponse {
  decision: RetrievalDecision;
  answer: string;
  citations?: string[];
  version?: number;
  transcript_chunk?: string;
  resolved_query?: string | null;
  subqueries?: SubQuery[];
  timestamp_s?: number | null;
  source?: "text" | "asr";
  telemetry?: BackendEventRaw[];
}

export interface AudioSegmentResult {
  timestamp_s: number;
  text: string;
  result: ChunkResponse;
}

export interface AudioResponse {
  session_id: string;
  segments: AudioSegmentResult[];
  language?: string | null;
  duration_s?: number | null;
}

export interface BackendHealth {
  status: string;
  code_version: string;
  corpus_chunks: number;
  llm_enabled: boolean;
  llm_model: string | null;
}

export interface CorpusOperationResponse {
  status: string;
  raw_dir?: string;
  corpus_dir?: string;
  corpus_chunks: number;
}

export interface BackendEventRaw {
  event_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  metadata: Record<string, unknown>;
}

export interface APIErrorResponse {
  detail?: string;
  message?: string;
}
