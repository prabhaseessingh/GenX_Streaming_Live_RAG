import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from threading import Lock

from .models import Claim, SessionState


class SQLiteStore:
    """Small durable store for sessions and telemetry events."""
    def __init__(self, path: str | Path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.lock = Lock()
        with self._connect() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                transcript TEXT NOT NULL,
                answer TEXT NOT NULL,
                answer_version INTEGER NOT NULL,
                intents_json TEXT NOT NULL,
                claims_json TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                metadata_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
            """)

    @contextmanager
    def _connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        finally:
            db.close()

    def save_session(self, state: SessionState):
        claims = [{"claim_id": c.claim_id, "text": c.text, "citations": c.citations, "dependencies": c.dependencies} for c in state.claims]
        with self.lock, self._connect() as db:
            db.execute("""INSERT INTO sessions(session_id, transcript, answer, answer_version, intents_json, claims_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET transcript=excluded.transcript, answer=excluded.answer,
                answer_version=excluded.answer_version, intents_json=excluded.intents_json,
                claims_json=excluded.claims_json, updated_at=CURRENT_TIMESTAMP""",
                (state.session_id, state.transcript, state.answer, state.answer_version,
                 json.dumps(state.intents), json.dumps(claims)))

    def load_session(self, session_id: str):
        with self.lock, self._connect() as db:
            row = db.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not row:
            return None
        claims = [Claim(c["claim_id"], c["text"], c["citations"], c.get("dependencies", [])) for c in json.loads(row["claims_json"])]
        return SessionState(session_id, row["transcript"], {}, json.loads(row["intents_json"]), claims, row["answer"], row["answer_version"])

    def save_event(self, event: dict):
        with self.lock, self._connect() as db:
            db.execute("INSERT OR IGNORE INTO events(event_id, session_id, timestamp, event_type, metadata_json) VALUES (?, ?, ?, ?, ?)",
                       (event["event_id"], event["session_id"], event["timestamp"], event["event_type"], json.dumps(event["metadata"])))

    def events_for_session(self, session_id: str):
        with self.lock, self._connect() as db:
            rows = db.execute("SELECT * FROM events WHERE session_id = ? ORDER BY rowid", (session_id,)).fetchall()
        return [{"event_id": r["event_id"], "session_id": r["session_id"], "timestamp": r["timestamp"], "event_type": r["event_type"], "metadata": json.loads(r["metadata_json"])} for r in rows]
