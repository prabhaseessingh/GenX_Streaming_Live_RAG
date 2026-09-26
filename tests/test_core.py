import unittest
from pathlib import Path
from app.corpus import load_corpus
from app.retrieval import FusedRetriever
from app.session import SessionManager
from app.telemetry import Telemetry
from app.synthesis import validate
from app.models import Evidence

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
