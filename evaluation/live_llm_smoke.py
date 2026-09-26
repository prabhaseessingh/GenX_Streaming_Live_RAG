"""Opt-in smoke tests for a running Groq-backed API."""
import json
import os
import sys
import urllib.request
from uuid import uuid4

BASE = os.getenv("RAG_API_URL", "http://127.0.0.1:8000")

def post(session, text):
    body = json.dumps({"text": text}).encode()
    req = urllib.request.Request(f"{BASE}/session/{session}/chunk", body, {"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode())

def run():
    if not os.getenv("GROQ_API_KEY"):
        print("GROQ_API_KEY is not set in this terminal")
        return 1
    checks = []
    session = "live-" + uuid4().hex[:8]
    first = post(session, "What are the foreign currency rules and missing receipt policies?")
    checks.append(("controller retrieves", first["decision"]["decision"] == "RETRIEVE"))
    checks.append(("answer has citations", bool(first.get("citations"))))
    second = post(session, "Rewrite the previous answer as two bullet points")
    checks.append(("presentation suppresses retrieval", second["decision"]["decision"] == "NO_RETRIEVE"))
    refined = post(session, "Actually, this was international travel and booked after travel")
    checks.append(("refinement increments version", refined.get("version", 0) >= 2))
    events_url = f"{BASE}/session/{session}/events"
    with urllib.request.urlopen(events_url, timeout=30) as response:
        events = json.loads(response.read().decode())
    types = {event["event_type"] for event in events}
    checks.append(("controller telemetry", "CONTROLLER_DECISION" in types))
    checks.append(("citation telemetry", "CITATION_VALIDATED" in types))
    checks.append(("no unexpected LLM error", "LLM_ERROR" not in types))
    for name, passed in checks: print(f"{'PASS' if passed else 'FAIL'}  {name}")
    return 0 if all(passed for _, passed in checks) else 1

if __name__ == "__main__": raise SystemExit(run())
