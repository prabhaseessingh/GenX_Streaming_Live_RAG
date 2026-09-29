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

    def test_manifest_metadata_and_ids_are_stable_across_rebuilds(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "source", Path(directory) / "output"
            source.mkdir()
            (source / "new_policy.md").write_text("# Receipts\nOriginal receipts are required.", encoding="utf-8")
            (source / "corpus_manifest.json").write_text(
                '[{"filename":"new_policy.md","doc_id":"DOC_NEW_POLICY","title":"New Policy","category":"Travel","url":"https://example.test/policy"}]',
                encoding="utf-8",
            )
            self.assertEqual(ingest_directory(source, output), 1)
            first = (output / "corpus.json").read_text(encoding="utf-8")
            self.assertEqual(ingest_directory(source, output), 1)
            second = (output / "corpus.json").read_text(encoding="utf-8")
            self.assertEqual(first, second)
            self.assertIn('"doc_id": "DOC_NEW_POLICY"', first)
            self.assertIn('"title": "New Policy"', first)

if __name__ == "__main__": unittest.main()
