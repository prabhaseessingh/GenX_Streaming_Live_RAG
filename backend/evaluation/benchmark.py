import json
import time
from pathlib import Path
from app.corpus import load_corpus
from app.retrieval import FusedRetriever
from app.session import SessionManager
from app.telemetry import Telemetry

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "data" / "processed" if (ROOT / "data" / "processed" / "corpus.json").exists() else ROOT / "data" / "documents"

def run():
    started = time.perf_counter()
    telemetry = Telemetry()
    manager = SessionManager(FusedRetriever(load_corpus(CORPUS)), telemetry)
    results = {}

    # Eligible stream: retrieval must begin before the final chunk.
    stream = ["I need to plan a workshop", "in Pune for 30 people", "with catering and cancellation terms"]
    decisions = [manager.ingest("early", chunk)["decision"]["decision"] for chunk in stream]
    results["early_retrieval"] = {"passed": "RETRIEVE" in decisions[:-1], "decisions": decisions}

    # Compound request should produce multiple searches and trace events.
    compound = manager.ingest("compound", "Find a venue for 30 people and tell me the cancellation policy and catering options")
    searches = [e for e in compound["telemetry"] if e["event_type"] == "SEARCH_STARTED"]
    results["multi_intent"] = {"passed": len(searches) >= 2, "search_count": len(searches)}

    # Corpus-only answer must carry valid chunk IDs.
    results["grounding"] = {"passed": bool(compound["citations"]) and all(c.startswith(("VENUE_", "POLICY_", "DOC_")) for c in compound["citations"]), "citations": compound["citations"]}

    # Presentation-only turn must not create another search.
    before = len([e for e in telemetry.events if e["event_type"] == "SEARCH_STARTED"])
    formatted = manager.ingest("compound", "repeat the last answer in bullet points")
    after = len([e for e in telemetry.events if e["event_type"] == "SEARCH_STARTED"])
    results["no_retrieve"] = {"passed": formatted["decision"]["decision"] == "NO_RETRIEVE" and before == after}

    # Version lineage and telemetry coverage.
    refined = manager.ingest("travel", "Summarize the reimbursement rules for an employee trip")
    refined = manager.ingest("travel", "The trip was international and booked after travel")
    session_events = telemetry.for_session("travel")
    results["session_refinement"] = {"passed": refined.get("version", 0) >= 2, "answer_version": refined.get("version", 0)}
    required_events = {"TRANSCRIPT_CHUNK", "CONTROLLER_DECISION", "SEARCH_STARTED", "SEARCH_COMPLETED", "ANSWER_GENERATED", "CITATION_VALIDATED"}
    actual_events = {e["event_type"] for e in telemetry.events}
    results["telemetry"] = {"passed": required_events.issubset(actual_events), "event_count": len(telemetry.events)}

    passed = sum(1 for r in results.values() if r["passed"])
    event_times = [e["timestamp"] for e in telemetry.events]
    report = {
        "passed": passed,
        "total": len(results),
        "metrics": {
            "early_retrieval_rate": 1.0 if results["early_retrieval"]["passed"] else 0.0,
            "multi_intent_pass_rate": 1.0 if results["multi_intent"]["passed"] else 0.0,
            "grounding_rate": 1.0 if results["grounding"]["passed"] else 0.0,
            "telemetry_event_count": len(event_times),
            "benchmark_runtime_ms": round((time.perf_counter() - started) * 1000, 2),
        },
        "results": results,
    }
    print(json.dumps(report, indent=2))
    return 0 if passed == len(results) else 1

if __name__ == "__main__": raise SystemExit(run())
