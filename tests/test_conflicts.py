import unittest
from app.models import Chunk, Evidence, Claim
from app.synthesis import detect_conflicts

class ConflictTests(unittest.TestCase):
    def test_different_policy_values_are_flagged(self):
        a = Evidence(Chunk("A", "ORG_A", "Mileage", 1, "Mileage is reimbursed at 50 miles per day."), 1)
        b = Evidence(Chunk("B", "ORG_B", "Mileage", 2, "Mileage is reimbursed at 75 miles per day."), .9)
        self.assertTrue(detect_conflicts({"Q1": [a, b]}))

    def test_unrelated_page_numbers_are_not_conflicts(self):
        a = Evidence(Chunk("A", "ORG_A", "Policy", 1, "Submit claims with receipts."), 1)
        b = Evidence(Chunk("B", "ORG_B", "Policy", 20, "Submit claims with receipts."), .9)
        self.assertFalse(detect_conflicts({"Q1": [a, b]}))

    def test_unrelated_numeric_chunk_is_ignored_for_answer_claim(self):
        relevant = Evidence(Chunk("A", "ORG_A", "Currency", 1, "Foreign currency conversion uses the exchange rate on the transaction date."), 1)
        unrelated = Evidence(Chunk("B", "ORG_B", "Travel", 2, "Laundry is reimbursed for trips of five or more days."), .9)
        claim = Claim("C1", "Foreign currency conversion and exchange rate on the transaction date.", ["A"])
        self.assertFalse(detect_conflicts({"Q1": [relevant, unrelated]}, [claim]))

if __name__ == "__main__": unittest.main()
