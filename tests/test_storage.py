import tempfile
import unittest
from pathlib import Path

from app.models import Claim, SessionState
from app.storage import SQLiteStore
from app.telemetry import Telemetry


class StorageTests(unittest.TestCase):
    def test_session_and_events_survive_store_reopen(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rag.sqlite3"
            store = SQLiteStore(path)
            state = SessionState("persisted", "hello", {}, ["policy"], [Claim("C1", "answer", ["DOC_1"], ["policy"])], "answer", 1)
            store.save_session(state)
            Telemetry(store).emit("persisted", "TEST_EVENT", ok=True)

            reopened = SQLiteStore(path)
            loaded = reopened.load_session("persisted")
            self.assertEqual(loaded.answer, "answer")
            self.assertEqual(loaded.claims[0].citations, ["DOC_1"])
            self.assertEqual(reopened.events_for_session("persisted")[0]["event_type"], "TEST_EVENT")


if __name__ == "__main__":
    unittest.main()
