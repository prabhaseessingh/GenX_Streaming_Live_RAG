import tempfile
import unittest
from pathlib import Path
from app.ingest import ingest_file, ingest_directory

class IngestTests(unittest.TestCase):
    def test_markdown_sections(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "policy.md"
            path.write_text("# Travel\nBase reimbursement rules.\n## International\nForeign receipt rules.", encoding="utf-8")
            chunks = ingest_file(path)
            self.assertEqual(len(chunks), 2)
            self.assertEqual(chunks[1].section, "International")

    def test_directory_writes_canonical_corpus(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "source", Path(directory) / "output"
            source.mkdir()
            (source / "a.md").write_text("# A\nSome evidence.", encoding="utf-8")
            self.assertEqual(ingest_directory(source, output), 1)
            self.assertTrue((output / "corpus.json").exists())

if __name__ == "__main__": unittest.main()
