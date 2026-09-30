import unittest
from pathlib import Path
from app.corpus import load_corpus
from app.retrieval import FusedRetriever
from evaluation.relevance import run

class RelevanceTests(unittest.TestCase):
    def test_policy_questions_retrieve_expected_documents(self):
        self.assertEqual(run(), 0)

    def test_foreign_currency_does_not_use_section_only_mileage_chunk(self):
        chunks = load_corpus(Path(__file__).parents[1] / "data" / "documents")
        retriever = FusedRetriever(chunks)
        results = retriever.search("What are the foreign currency reimbursement rules?", top_k=5)
        mileage_chunk = next((item for item in results if item.chunk.chunk_id == "DOC_06_NORTHWESTERN_TRAVEL_0004"), None)
        if mileage_chunk:
            body = mileage_chunk.chunk.text.lower()
            self.assertRegex(body, r"foreign|currency")

if __name__ == "__main__": unittest.main()
