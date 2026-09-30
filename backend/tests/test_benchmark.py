import unittest
from evaluation.benchmark import run

class BenchmarkSmokeTest(unittest.TestCase):
    def test_replay_suite(self):
        self.assertEqual(run(), 0)

if __name__ == "__main__": unittest.main()
