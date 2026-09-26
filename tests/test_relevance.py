import unittest
from evaluation.relevance import run

class RelevanceTests(unittest.TestCase):
    def test_policy_questions_retrieve_expected_documents(self):
        self.assertEqual(run(), 0)

if __name__ == "__main__": unittest.main()
