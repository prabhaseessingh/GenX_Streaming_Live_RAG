import unittest
from app.decomposer import decompose

class DecomposerTests(unittest.TestCase):
    def test_compound_request_creates_distinct_intents(self):
        result = decompose("Find a venue for 30 people in Pune and tell me the cancellation policy and catering options")
        self.assertGreaterEqual(len(result), 3)
        self.assertEqual([item["intent"] for item in result[:3]], ["capacity", "cancellation", "catering"])
        self.assertTrue(all("Pune" in item["query"] for item in result))

    def test_simple_question_is_not_over_fragmented(self):
        result = decompose("What is the cancellation policy for Pune Workshop Hall?")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["intent"], "cancellation")

    def test_comma_context_stays_together(self):
        result = decompose("Find a venue in Pune, for 30 people")
        self.assertEqual(len(result), 1)
        self.assertIn("30 people", result[0]["query"])

if __name__ == "__main__": unittest.main()
