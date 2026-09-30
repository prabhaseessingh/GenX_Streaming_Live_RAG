# GenX Streaming Live RAG — Backend API and RAG Pipeline

The backend is a FastAPI service for incremental streaming RAG. It accepts transcript chunks or audio, decides when retrieval is justified, retrieves evidence from a replaceable corpus, generates grounded answers, and persists sessions and telemetry.

## Key features

- **Incremental controller**: `WAIT`, `RETRIEVE`, and `NO_RETRIEVE`.
- **Multi-intent decomposition**: splits compound questions and retrieves subqueries in parallel.
- **Hybrid retrieval**: lexical/BM25, deterministic dense features, reciprocal-rank fusion, and optional CrossEncoder reranking.
- **Session refinement**: delta retrieval for changed context and follow-up chunks.
- **Corpus-independent ingestion**: PDF, Markdown, TXT, and JSON ingestion with section-aware chunks and stable document IDs.
- **Grounded synthesis**: Groq LLM answering with deterministic fallback when the LLM is unavailable.
- **Safety validation**: citation validation, claim grounding, optional NLI entailment, contradiction detection, and uncertainty flags.
- **ASR pipeline**: local Faster-Whisper transcription with timestamped segments.
- **Persistence and operations**: SQLite sessions/events, optional API-key authentication, and optional per-IP rate limiting.

## Technology stack

- **API**: FastAPI, Uvicorn, Pydantic-style request handling
- **Language**: Python 3.12+
- **LLM provider**: Groq OpenAI-compatible chat completions
- **PDF extraction**: pypdf
- **Retrieval**: custom BM25/lexical/deterministic dense fusion
- **Optional ML**: sentence-transformers CrossEncoder
- **ASR**: Faster-Whisper with CPU/int8 support
- **Persistence**: SQLite
- **Testing**: Python unittest
- **Deployment**: Docker/Docker Compose

## Backend structure

```
backend/
├── app/
│   ├── main.py          # FastAPI routes, auth, rate limiting, ASR/corpus endpoints
│   ├── session.py       # Incremental session orchestration
│   ├── controller.py    # WAIT/RETRIEVE/NO_RETRIEVE decisions
│   ├── decomposer.py    # Multi-intent question decomposition
│   ├── retrieval.py     # Hybrid retrieval and optional reranking
│   ├── synthesis.py     # Grounded answer generation and citation checks
│   ├── entailment.py    # Optional semantic claim validation
│   ├── ingest.py        # PDF/text/JSON extraction and chunking
│   ├── corpus.py        # Processed corpus loading
│   ├── asr.py           # Faster-Whisper adapter
│   ├── llm.py           # Groq and deterministic providers
│   ├── storage.py       # SQLite persistence
│   ├── telemetry.py     # Structured event creation
│   └── cli.py           # Demo and corpus ingestion CLI
├── data/
│   ├── raw/             # Source corpus and optional corpus manifest
│   ├── processed/       # corpus.json and generated artifacts
│   └── rag.sqlite3      # Local runtime database; ignored by Git
├── evaluation/          # Benchmark/relevance scripts
├── tests/               # Backend unit and integration tests
├── docs/                # API, project flow, and evaluation report
├── .env.example         # Configuration template
├── requirements.txt     # Single dependency file
├── Dockerfile
└── docker-compose.yml
```

## Local setup

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Set `GROQ_API_KEY` in `.env` for LLM mode. Leave it empty for deterministic offline mode. The application loads `.env` automatically when started from the backend directory.

Start the API:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify it:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health" | ConvertTo-Json
```

## API endpoints

- `GET /health`
- `POST /session/{session_id}/chunk`
- `POST /session/{session_id}/audio`
- `GET /session/{session_id}/events`
- `POST /corpus/upload`
- `POST /corpus/rebuild`
- `WS /ws/session/{session_id}`

For request/response examples and authentication details, see [docs/API.md](docs/API.md).

Example transcript request:

```powershell
$body = @{ text = "What are the foreign currency reimbursement rules?" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/session/demo-1/chunk" `
  -ContentType "application/json" `
  -Body $body
```

Example audio request:

```powershell
curl.exe -X POST -F "file=@sample.wav" http://127.0.0.1:8000/session/demo-1/audio
```

## Configuration

Use `.env.example` as the source of truth.

- `GROQ_API_KEY`, `GROQ_MODEL`: LLM answering and controller stages.
- `RAG_API_KEY`: when set, clients must send `X-API-Key`.
- `RAG_RATE_LIMIT_PER_MINUTE`: optional request limit; `0` disables it.
- `RAG_DB_PATH`: SQLite path.
- `RAG_CORPUS_DIR`, `RAG_RAW_DIR`: processed corpus and source directories.
- `RERANKER_*`: optional local CrossEncoder reranking.
- `ENTAILMENT_*`: optional local NLI validation.
- `ASR_MODEL`, `ASR_DEVICE`, `ASR_COMPUTE_TYPE`: Faster-Whisper settings.

Local ML models download on first use unless local-only mode is enabled and the model is already cached locally.

## Corpus ingestion

Rebuild from all files in `data/raw`:

```powershell
python -m app.cli ingest data/raw data/processed
```

Run the API rebuild endpoint:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/corpus/rebuild"
```

Upload a document:

```powershell
curl.exe -X POST -F "file=@new-policy.pdf" http://127.0.0.1:8000/corpus/upload
```

The manifest `data/raw/corpus_manifest.json` may specify `filename`, `doc_id`, `title`, `category`, and `url`. Chunk IDs are derived from stable document IDs and chunk order.

## Testing and evaluation

```powershell
python -m unittest discover -s tests -v
python -m evaluation.benchmark
python -m evaluation.relevance
python -m evaluation.live_llm_smoke
```

The evaluation report is [docs/EVALUATION_REPORT.md](docs/EVALUATION_REPORT.md).

## Docker

From `backend/`:

```powershell
docker compose up --build api
```

The API is available at http://127.0.0.1:8000. Set secrets through the shell environment or an untracked `.env`; never bake API keys into the image.

## Development notes

- Keep policy-specific behavior in the corpus, not production logic.
- Do not commit `.env`, `.venv`, SQLite databases, private raw PDFs, model caches, or generated Python bytecode.
- Update API docs and tests when adding endpoints.
- The frontend expects the backend at port 8000 and uses a Next.js rewrite for `/api/rag`.

