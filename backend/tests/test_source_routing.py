import unittest
from pathlib import Path
from app.corpus import load_corpus
from app.retrieval import FusedRetriever

class SourceRoutingTests(unittest.TestCase):
    def test_named_source_is_prioritized(self):
        chunks = load_corpus(Path(__file__).parents[1] / "data" / "processed")
        results = FusedRetriever(chunks).search("What does Acadia University say about foreign currency?", 3)
        self.assertEqual(results[0].chunk.doc_id, "DOC_03_ACADIA_TRAVEL")

if __name__ == "__main__": unittest.main()
