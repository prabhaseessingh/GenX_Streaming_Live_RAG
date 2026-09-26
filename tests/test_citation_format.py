import unittest
from app.session import SessionManager
from app.retrieval import FusedRetriever
from app.corpus import load_corpus
from app.telemetry import Telemetry

class FakeLLM:
    model = "fake"
    last_latency_ms = 0
    last_usage = {}
    def decide(self, text, previous):
        from app.models import RetrievalDecision
        return RetrievalDecision("RETRIEVE", .9)
    def decompose(self, text):
        return [{"id":"Q1", "intent":"policy", "query":text, "priority":1}]
    def synthesize(self, subqueries, evidence):
        return "- Unsupported claim ãDOC_01_FAKEã"

class UnsupportedButCitedLLM(FakeLLM):
    def synthesize(self, subqueries, evidence):
        citation = evidence["Q1"][0].chunk.chunk_id
        return f"- Volcano relocation is covered by the policy [{citation}]"

class CitationFormatTests(unittest.TestCase):
    def test_malformed_document_delimiter_is_rejected(self):
        manager = SessionManager(FusedRetriever(load_corpus("data/documents")), Telemetry(), FakeLLM())
        result = manager.ingest("format", "What is the policy?")
        self.assertTrue(any(e["event_type"] == "LLM_DRAFT_REJECTED" for e in result["telemetry"]))

    def test_unsupported_accepted_draft_falls_back(self):
        manager = SessionManager(FusedRetriever(load_corpus("data/documents")), Telemetry(), UnsupportedButCitedLLM())
        result = manager.ingest("grounding-fallback", "What is the relocation policy?")
        self.assertNotIn("Volcano relocation", result["answer"])
        self.assertTrue(any(e["event_type"] == "LLM_DRAFT_REJECTED" and e["metadata"].get("reason") == "claim_validation_failed" for e in result["telemetry"]))

if __name__ == "__main__": unittest.main()
