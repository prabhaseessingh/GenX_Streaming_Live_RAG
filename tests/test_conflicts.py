import unittest
from app.models import Chunk, Evidence
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

if __name__ == "__main__": unittest.main()
