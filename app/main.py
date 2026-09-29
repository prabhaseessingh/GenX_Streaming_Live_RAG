from pathlib import Path
import os
from dotenv import load_dotenv
import time
from collections import defaultdict, deque
from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse
from fastapi import Header, HTTPException, Request, Depends, UploadFile, File
from tempfile import NamedTemporaryFile
import shutil
from .corpus import load_corpus
from .retrieval import FusedRetriever
from .session import SessionManager
from .llm import build_provider
from .telemetry import Telemetry
from .storage import SQLiteStore
from .asr import FasterWhisperASR, ASRUnavailable
from .ingest import ingest_directory

load_dotenv()
app = FastAPI(title="Adaptive Incremental RAG")
CODE_VERSION = "production-v4"
root = Path(__file__).resolve().parents[1]
configured = os.getenv("RAG_CORPUS_DIR")
default_corpus = root / "data" / "processed" if (root / "data" / "processed" / "corpus.json").exists() else root / "data" / "documents"
store = SQLiteStore(os.getenv("RAG_DB_PATH", str(root / "data" / "rag.sqlite3")))
manager = SessionManager(FusedRetriever(load_corpus(Path(configured) if configured else default_corpus)), Telemetry(store), build_provider(), store)
_requests = defaultdict(deque)
_asr = None

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

@app.post("/session/{session_id}/audio", dependencies=[Depends(authorize)])
def audio_chunk(session_id: str, file: UploadFile = File(...)):
    """Transcribe an audio recording and feed timestamped segments in order."""
    global _asr
    if not file.filename:
        raise HTTPException(status_code=400, detail="An audio file is required")
    try:
        if _asr is None:
            _asr = FasterWhisperASR()
        suffix = Path(file.filename).suffix or ".audio"
        with NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            shutil.copyfileobj(file.file, temp)
            temp_path = temp.name
        try:
            segments, info = _asr.transcribe(temp_path)
        finally:
            Path(temp_path).unlink(missing_ok=True)
    except ASRUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Audio transcription failed: {exc}") from exc

    results = []
    for segment in segments:
        result = manager.ingest(session_id, segment["text"], timestamp_s=segment["timestamp_s"], source="asr")
        results.append({"timestamp_s": segment["timestamp_s"], "text": segment["text"], "result": result})
    return {"session_id": session_id, "segments": results, "language": getattr(info, "language", None), "duration_s": getattr(info, "duration", None)}

@app.post("/corpus/rebuild", dependencies=[Depends(authorize)])
def rebuild_corpus():
    """Rebuild the processed corpus from RAG_RAW_DIR without code changes."""
    raw_dir = Path(os.getenv("RAG_RAW_DIR", str(root / "data" / "raw")))
    output_dir = Path(os.getenv("RAG_CORPUS_DIR", str(root / "data" / "processed")))
    count = ingest_directory(raw_dir, output_dir)
    manager.replace_corpus(load_corpus(output_dir))
    return {"status": "ok", "raw_dir": str(raw_dir), "corpus_dir": str(output_dir), "corpus_chunks": count}

@app.post("/corpus/upload", dependencies=[Depends(authorize)])
def upload_corpus(file: UploadFile = File(...)):
    """Store one new source document, rebuild the corpus, and hot-reload retrieval."""
    if not file.filename or Path(file.filename).suffix.lower() not in {".pdf", ".md", ".markdown", ".txt", ".json"}:
        raise HTTPException(status_code=400, detail="Supported corpus files: PDF, Markdown, TXT, JSON")
    raw_dir = Path(os.getenv("RAG_RAW_DIR", str(root / "data" / "raw")))
    raw_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    destination = raw_dir / safe_name
    with destination.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    return rebuild_corpus()

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
