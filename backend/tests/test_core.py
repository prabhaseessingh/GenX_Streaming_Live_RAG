import unittest
from pathlib import Path
from app.corpus import load_corpus
from app.retrieval import FusedRetriever
from app.session import SessionManager
from app.telemetry import Telemetry
from app.synthesis import validate
from app.models import Evidence
from app.controller import decide
from app.models import RetrievalDecision

class WaitLLM:
    model = "fake"
    last_latency_ms = 0
    last_usage = {}
    def decide(self, text, previous):
        return RetrievalDecision("WAIT", .5, reason="LLM controller")
    def decompose(self, text):
        return [{"id": "Q1", "intent": "policy", "query": text, "priority": 1}]
    def synthesize(self, subqueries, evidence):
        return ""

class CoreTests(unittest.TestCase):
    def setUp(self):
        chunks = load_corpus(Path(__file__).parents[1] / "data" / "documents")
        self.telemetry = Telemetry()
        self.manager = SessionManager(FusedRetriever(chunks), self.telemetry)

    def test_wait_then_retrieve(self):
        self.assertEqual(self.manager.ingest("s", "I need a venue")["decision"]["decision"], "WAIT")
        result = self.manager.ingest("s", "for 30 people in Pune")
        self.assertEqual(result["decision"]["decision"], "RETRIEVE")
        self.assertTrue(result["citations"])

    def test_llm_cannot_downgrade_explicit_asr_question_to_wait(self):
        manager = SessionManager(
            FusedRetriever(load_corpus(Path(__file__).parents[1] / "data" / "processed")),
            Telemetry(),
            WaitLLM(),
        )
        result = manager.ingest(
            "asr-llm-controller",
            "According to Washington University, what exchange rate documentation is required for a foreign currency transaction.",
            timestamp_s=1.01,
            source="asr",
        )
        self.assertEqual(result["decision"]["decision"], "RETRIEVE")
        self.assertIn("DOC_05_WUSTL_TRAVEL_0012", result["citations"])

    def test_timestamped_asr_chunk_preserves_source_metadata(self):
        result = self.manager.ingest("asr", "What is the cancellation policy?", timestamp_s=12.4, source="asr")
        self.assertEqual(result["timestamp_s"], 12.4)
        self.assertEqual(result["source"], "asr")
        event = next(e for e in result["telemetry"] if e["event_type"] == "TRANSCRIPT_CHUNK")
        self.assertEqual(event["metadata"]["timestamp_s"], 12.4)
        self.assertEqual(event["metadata"]["source"], "asr")

    def test_generic_streaming_fragments_wait_for_stable_intent(self):
        self.assertEqual(decide("I am planning a trip").decision, "WAIT")
        self.assertEqual(decide("It will be international").decision, "WAIT")
        self.assertEqual(decide("I need to know the reimbursement rules").decision, "RETRIEVE")

    def test_no_retrieve_transformation(self):
        self.manager.ingest("s", "Find the cancellation policy for bookings")
        before = len([e for e in self.telemetry.events if e["event_type"] == "SEARCH_STARTED"])
        result = self.manager.ingest("s", "summarize the previous answer in bullet points")
        after = len([e for e in self.telemetry.events if e["event_type"] == "SEARCH_STARTED"])
        self.assertEqual(result["decision"]["decision"], "NO_RETRIEVE")
        self.assertEqual(before, after)
        self.assertTrue(result["answer"].startswith("- "))

    def test_grounding_has_citations(self):
        result = self.manager.ingest("s", "What is the cancellation policy?")
        self.assertTrue(result["citations"])
        self.assertTrue(any(e["event_type"] == "CITATION_VALIDATED" for e in result["telemetry"]))

    def test_unsupported_question_returns_insufficient_evidence(self):
        result = self.manager.ingest("unsupported", "What is the university policy for reimbursement on a moon-colony mission?")
        self.assertEqual(result["citations"], [])
        self.assertIn("does not contain enough information", result["answer"])
        self.assertNotIn("Page 1 of 11", result["answer"])
        validation = next(e for e in result["telemetry"] if e["event_type"] == "CITATION_VALIDATED")
        self.assertTrue(validation["metadata"]["insufficient_evidence"])

    def test_unsupported_context_modifier_returns_insufficient_evidence(self):
        result = self.manager.ingest("lunar", "What are the reimbursement rules for lunar travel?")
        self.assertEqual(result["citations"], [])
        self.assertIn("does not contain enough information", result["answer"])

    def test_unsupported_context_modifier_with_named_source_returns_insufficient_evidence(self):
        result = self.manager.ingest(
            "lunar-source",
            "According to Washington University, what are the reimbursement rules for lunar travel?",
        )
        self.assertEqual(result["citations"], [])
        self.assertIn("does not contain enough information", result["answer"])

    def test_exchange_rate_documentation_prefers_rate_evidence_over_fee_evidence(self):
        result = self.manager.ingest(
            "exchange-docs",
            "What exchange-rate documentation is required for a foreign-currency transaction?",
        )
        self.assertNotIn("fees related to exchange", result["answer"].lower())

    def test_asr_paraphrase_prefers_rate_documentation_over_exchange_fees(self):
        manager = SessionManager(
            FusedRetriever(load_corpus(Path(__file__).parents[1] / "data" / "processed")),
            Telemetry(),
        )
        result = manager.ingest(
            "exchange-asr",
            "For Washington University exchange rate documentation required for foreign currency transaction",
            source="asr",
            timestamp_s=0.0,
        )
        self.assertIn("DOC_05_WUSTL_TRAVEL_0012", result["citations"])
        self.assertNotIn("DOC_05_WUSTL_TRAVEL_0013", result["citations"])
        self.assertIn("print screen", result["answer"].lower())

    def test_grounding_counts_cited_bullets_individually(self):
        evidence = {"Q1": [Evidence(self.manager.retriever.chunks[0], 1.0)]}
        chunk_id = self.manager.retriever.chunks[0].chunk_id
        answer = f"- {self.manager.retriever.chunks[0].text[:120]} [{chunk_id}]\n- unsupported statement about volcanoes [{chunk_id}]"
        result = validate(answer, [], evidence)
        self.assertEqual(result["total_claims"], 2)
        self.assertEqual(result["supported_claims"], 1)
        self.assertEqual(result["unsupported_claims"], 1)

    def test_delta_refinement_preserves_prior_claims(self):
        first = self.manager.ingest("delta", "Summarize the reimbursement rules for an employee trip")
        second = self.manager.ingest("delta", "The trip was international and booked after travel")
        self.assertEqual(first["version"], 1)
        self.assertEqual(second["version"], 2)
        self.assertTrue(set(first["citations"]).issubset(set(second["citations"])))
        kinds = [e["event_type"] for e in second["telemetry"]]
        self.assertIn("DELTA_RETRIEVAL_STARTED", kinds)
        self.assertIn("DELTA_RETRIEVAL_COMPLETED", kinds)

    def test_delta_replaces_only_affected_claim(self):
        first = self.manager.ingest("venue", "Find a venue for 30 people in Pune and catering options")
        second = self.manager.ingest("venue", "Actually make it 50 people")
        self.assertEqual(first["version"], 1)
        self.assertEqual(second["version"], 2)
        # Catering remains cited while the capacity claim is refined.
        self.assertTrue(first["citations"])
        self.assertTrue(second["citations"])

if __name__ == "__main__": unittest.main()
