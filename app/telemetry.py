from dataclasses import asdict
from datetime import datetime, timezone
from uuid import uuid4

class Telemetry:
    def __init__(self, store=None):
        self.events = []
        self.store = store

    def emit(self, session_id: str, event_type: str, **metadata):
        event = {
            "event_id": str(uuid4()),
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "metadata": metadata,
        }
        self.events.append(event)
        if self.store:
            self.store.save_event(event)
        return event

    def for_session(self, session_id):
        local = [e for e in self.events if e["session_id"] == session_id]
        return self.store.events_for_session(session_id) if self.store else local
