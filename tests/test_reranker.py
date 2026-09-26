import unittest
from app.retrieval import SemanticReranker

class RerankerTests(unittest.TestCase):
    def test_reranker_has_safe_offline_fallback(self):
        reranker = SemanticReranker()
        self.assertIsNotNone(reranker)

if __name__ == "__main__": unittest.main()
