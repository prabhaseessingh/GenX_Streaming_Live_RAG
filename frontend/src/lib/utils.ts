import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { EventCategory } from "@/types/events";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `sess_${timestamp}_${random}`;
}

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return isoString;
  }
}

export function getEventCategory(eventType: string): EventCategory {
  switch (eventType) {
    case "TRANSCRIPT_CHUNK":
      return "TRANSCRIPT";
    case "CONTROLLER_DECISION":
    case "NO_RETRIEVE":
      return "CONTROLLER";
    case "SUBQUERIES_CREATED":
    case "SEARCH_STARTED":
    case "SEARCH_COMPLETED":
    case "RETRIEVAL_LATENCY":
    case "DELTA_RETRIEVAL_STARTED":
    case "DELTA_RETRIEVAL_COMPLETED":
      return "RETRIEVAL";
    case "LLM_USAGE":
    case "LLM_DRAFT_ACCEPTED":
    case "LLM_DRAFT_REJECTED":
      return "LLM";
    case "CITATION_VALIDATED":
      return "GROUNDING";
    case "ANSWER_GENERATED":
      return "ANSWER";
    case "LLM_ERROR":
      return "ERROR";
    default:
      return "RETRIEVAL";
  }
}
