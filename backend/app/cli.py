import json
import sys
import os
from pathlib import Path
from .corpus import load_corpus
from .retrieval import FusedRetriever
from .session import SessionManager
from .telemetry import Telemetry
from .ingest import ingest_directory
from .llm import build_provider

def demo():
    root = Path(__file__).resolve().parents[1]
    configured = os.getenv("RAG_CORPUS_DIR")
    default_corpus = root / "data" / "processed" if (root / "data" / "processed" / "corpus.json").exists() else root / "data" / "documents"
    manager = SessionManager(FusedRetriever(load_corpus(Path(configured) if configured else default_corpus)), Telemetry(), build_provider())
    chunks = ["I need a workshop venue", "for 30 people in Pune", "what is the cancellation policy", "and whether catering is available", "Actually make it 50 people"]
    for chunk in chunks:
        result = manager.ingest("demo", chunk)
        print(json.dumps({"chunk": chunk, "decision": result["decision"]["decision"], "version": result.get("version", 0), "answer": result.get("answer", "")}, indent=2))

if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "ingest":
        source = sys.argv[2] if len(sys.argv) > 2 else "data/raw"
        output = sys.argv[3] if len(sys.argv) > 3 else "data/processed"
        print(f"Ingested {ingest_directory(source, output)} chunks")
    else:
        demo()
