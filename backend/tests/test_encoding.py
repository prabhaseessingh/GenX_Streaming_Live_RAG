import unittest
from app.synthesis import clean_answer
from app.ingest import repair_text

class EncodingTests(unittest.TestCase):
    def test_repairs_common_mojibake(self):
        source = "Foreignâ\u0080\x91currency and Universityâ\u0080\x99s policy"
        cleaned = clean_answer(source)
        self.assertIn("Foreign-currency", cleaned)
        self.assertIn("University's", cleaned)

    def test_repairs_residual_isolated_marker(self):
        self.assertEqual(repair_text("foreignâcurrency"), "foreign-currency")

    def test_removes_corrupted_nonbreaking_spaces(self):
        self.assertEqual(clean_answer("paid.â¯[DOC_01] U.S.â¯dollars"), "paid. [DOC_01] U.S. dollars")

if __name__ == "__main__": unittest.main()
