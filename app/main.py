from pathlib import Path
import os
from dotenv import load_dotenv
import time
from collections import defaultdict, deque
from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse
from fastapi import Header, HTTPException, Request, Depends
from .corpus import load_corpus
from .retrieval import FusedRetriever
from .session import SessionManager
from .llm import build_provider
from .telemetry import Telemetry
from .storage import SQLiteStore

load_dotenv()
app = FastAPI(title="Adaptive Incremental RAG")
CODE_VERSION = "production-v4"
root = Path(__file__).resolve().parents[1]
configured = os.getenv("RAG_CORPUS_DIR")
default_corpus = root / "data" / "processed" if (root / "data" / "processed" / "corpus.json").exists() else root / "data" / "documents"
store = SQLiteStore(os.getenv("RAG_DB_PATH", str(root / "data" / "rag.sqlite3")))
manager = SessionManager(FusedRetriever(load_corpus(Path(configured) if configured else default_corpus)), Telemetry(store), build_provider(), store)
_requests = defaultdict(deque)

def authorize(x_api_key: str | None = Header(default=None)):
    expected = os.getenv("RAG_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    limit = int(os.getenv("RAG_RATE_LIMIT_PER_MINUTE", "0"))
    if limit > 0:
        now = time.time()
        key = request.client.host if request.client else "unknown"
        q = _requests[key]
        while q and q[0] <= now - 60: q.popleft()
        if len(q) >= limit:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        q.append(now)
    return await call_next(request)

@app.get("/health", dependencies=[Depends(authorize)])
def health():
    return {"status": "ok", "code_version": CODE_VERSION, "corpus_chunks": len(manager.retriever.chunks), "llm_enabled": bool(manager.llm), "llm_model": getattr(manager.llm, "model", None)}

@app.post("/session/{session_id}/chunk", dependencies=[Depends(authorize)])
def chunk(session_id: str, payload: dict): return manager.ingest(session_id, payload.get("text", ""))

@app.get("/session/{session_id}/events", dependencies=[Depends(authorize)])
def events(session_id: str): return manager.telemetry.for_session(session_id)

@app.websocket("/ws/session/{session_id}")
async def websocket(ws: WebSocket, session_id: str):
    expected = os.getenv("RAG_API_KEY")
    if expected and ws.headers.get("x-api-key") != expected:
        await ws.close(code=1008)
        return
    await ws.accept()
    while True:
        payload = await ws.receive_json()
        await ws.send_json(manager.ingest(session_id, payload.get("text", "")))
