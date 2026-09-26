# Adaptive Incremental RAG

Backend-first implementation for the Streaming Live RAG hackathon track. The system processes transcript chunks, decides whether retrieval is needed, decomposes compound questions, retrieves and reranks policy evidence, and returns citation-grounded answers with uncertainty and telemetry.

## Features

- `WAIT` / `RETRIEVE` / `NO_RETRIEVE` controller
- Multi-intent decomposition and parallel retrieval
- BM25, lexical, deterministic dense retrieval, and reciprocal-rank fusion
- Optional CrossEncoder semantic reranking
- Session refinement and delta retrieval
- PDF/Markdown/JSON ingestion with section-aware chunking
- Claim-level citation and grounding validation
- Contradiction/uncertainty handling and structured telemetry
- Groq LLM answering with deterministic fallback

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create the local environment file from the template:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `GROQ_API_KEY` in `.env` if you want LLM mode. Keep `.env` local; it is
ignored by Git. Leave it empty for offline deterministic mode.

The processed corpus is included at `data/processed/corpus.json`. Rebuild it after changing raw documents:

```powershell
Remove-Item -Recurse -Force data/processed -ErrorAction SilentlyContinue
python -m app.cli ingest data/raw data/processed
```

## Offline run and evaluation

```powershell
python -m app.cli demo
python -m unittest discover -s tests -v
python -m evaluation.benchmark
python -m evaluation.relevance
```

## API

```powershell
python -m uvicorn app.main:app --reload
```

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"

$body = @{ text = "What are the foreign currency reimbursement rules?" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/session/demo-1/chunk" -ContentType "application/json" -Body $body
```

Use a new session ID for an independent conversation. Active state is cached in
memory and persisted to SQLite for recovery across restarts.

Endpoints: `GET /health`, `POST /session/{id}/chunk`, `GET /session/{id}/events`, and `WS /ws/session/{id}`. See [docs/API.md](docs/API.md).

For the architecture, request lifecycle, file ownership, safety rules, and
future work, see [docs/PROJECT_FLOW.md](docs/PROJECT_FLOW.md).

Sessions and telemetry persist to SQLite at `data/rag.sqlite3` by default. Set
`RAG_DB_PATH` to use another location. Set `RAG_API_KEY` to enable API-key
authentication and `RAG_RATE_LIMIT_PER_MINUTE` to enable per-IP rate limiting.

## Groq mode

Edit `.env`:

```dotenv
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
```

Then start the API normally. The application loads `.env` automatically:

```powershell
python -m uvicorn app.main:app --reload
python -m evaluation.live_llm_smoke
```

Malformed or failed LLM drafts are rejected and replaced by deterministic grounded answers. Optional semantic reranking can be enabled with `python -m pip install -r requirements-ml.txt` and `RERANKER_MODEL`.

For optional NLI-based claim validation, set `ENTAILMENT_MODEL` to a compatible
three-class CrossEncoder model. If it is unavailable, claim validation falls
back to deterministic evidence overlap.

The raw PDFs under `data/raw/` are ignored by Git because their redistribution
rights may vary. The processed corpus and manifest are included so the repo
can run immediately. Only commit raw PDFs if the hackathon explicitly permits
their redistribution.
