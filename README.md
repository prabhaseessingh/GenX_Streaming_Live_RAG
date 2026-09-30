# GenX Streaming Live RAG

GenX Streaming Live RAG is an end-to-end streaming retrieval-augmented generation system for live transcripts and audio. It waits for stable intent, retrieves only when useful, answers from the supplied corpus, validates citations and grounding, and exposes the decision and telemetry trail in a web control room.

## What the product does

- Accepts transcript chunks over HTTP or WebSocket.
- Accepts audio and transcribes it locally with Faster-Whisper.
- Preserves ASR timestamps and forwards segments through the same incremental pipeline.
- Chooses `WAIT`, `RETRIEVE`, or `NO_RETRIEVE`.
- Decomposes multi-intent questions and retrieves evidence in parallel.
- Combines lexical, BM25, deterministic dense, reciprocal-rank fusion, and optional CrossEncoder reranking.
- Generates grounded answers through Groq when configured, with a deterministic offline fallback.
- Rejects malformed or weakly grounded LLM drafts.
- Detects conflicts and reports uncertainty instead of silently merging policy values.
- Persists sessions and telemetry in SQLite.
- Supports corpus upload and rebuild without changing application code.
- Provides user verification and developer observability views in the frontend.

## Repository layout

```
.
├── backend/
│   ├── app/                 # FastAPI API and RAG pipeline
│   ├── data/                # Raw and processed corpus plus local SQLite state
│   ├── docs/                # API, project flow, and evaluation report
│   ├── evaluation/          # Benchmark and relevance evaluation
│   ├── tests/               # Automated backend tests
│   ├── .env.example         # Backend configuration template
│   ├── requirements.txt     # Single backend dependency file
│   └── README.md            # Backend-specific setup and architecture
├── frontend/
│   ├── src/                 # Next.js application
│   ├── public/              # Logos and static assets
│   ├── package.json         # Frontend scripts and dependencies
│   └── README.md            # Frontend-specific setup and structure
├── start-dev.bat            # Windows setup and launcher
├── start-dev.sh             # macOS/Linux setup and launcher
└── README.md                # This project guide
```

## Quick start

### One command

Windows PowerShell or Command Prompt:

```bat
start-dev.bat
```

macOS/Linux:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

The launcher creates the backend virtual environment when needed, installs backend dependencies on first setup, installs frontend packages when `node_modules` is missing, creates `backend/.env` from the template when needed, and starts both development servers.

- Backend API: http://127.0.0.1:8000
- API health: http://127.0.0.1:8000/health
- Frontend: http://127.0.0.1:3000

### Manual setup

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and add GROQ_API_KEY if LLM mode is required
python -m uvicorn app.main:app --reload
```

Frontend, in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

For macOS/Linux, activate the backend environment with `source .venv/bin/activate`.

## Configuration

Backend configuration lives in `backend/.env`. Start from `backend/.env.example`.

Important settings:

- `GROQ_API_KEY`: enables Groq LLM controller, decomposition, and synthesis.
- `GROQ_MODEL`: Groq model name.
- `RAG_API_KEY`: optional API-key protection for HTTP and WebSocket requests.
- `RAG_RATE_LIMIT_PER_MINUTE`: optional per-IP request limit.
- `RAG_CORPUS_DIR`, `RAG_RAW_DIR`: processed and source corpus locations.
- `RERANKER_ENABLED`, `RERANKER_MODEL`: optional local semantic reranking.
- `ENTAILMENT_ENABLED`, `ENTAILMENT_MODEL`: optional local claim entailment validation.
- `ASR_MODEL`, `ASR_DEVICE`, `ASR_COMPUTE_TYPE`: local Faster-Whisper settings.
- `NEXT_PUBLIC_API_URL`: optional frontend backend URL override; the frontend normally proxies through `/api/rag`.
- `NEXT_PUBLIC_API_KEY`: optional frontend API key. A browser-stored `rag_api_key` takes precedence.

Never commit `backend/.env`, API keys, SQLite databases, virtual environments, `node_modules`, or private raw documents.

## Corpus workflow

Place supported files in `backend/data/raw/`, or use the frontend Corpus Management panel.

Supported formats: PDF, Markdown, TXT, and JSON.

Rebuild manually:

```powershell
cd backend
python -m app.cli ingest data/raw data/processed
```

Or call:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/corpus/rebuild"
```

Stable document IDs can be assigned through `backend/data/raw/corpus_manifest.json`. See `backend/docs/API.md` and `backend/docs/PROJECT_FLOW.md`.

## Testing and evaluation

```powershell
cd backend
python -m unittest discover -s tests -v
python -m evaluation.benchmark
python -m evaluation.relevance
```

The current evaluation summary is in [backend/docs/EVALUATION_REPORT.md](backend/docs/EVALUATION_REPORT.md).

## API and architecture

- API reference: [backend/docs/API.md](backend/docs/API.md)
- Project flow: [backend/docs/PROJECT_FLOW.md](backend/docs/PROJECT_FLOW.md)
- Backend implementation: [backend/README.md](backend/README.md)
- Frontend implementation: [frontend/README.md](frontend/README.md)

## Typical demo flow

1. Start both services with `start-dev.bat` or `start-dev.sh`.
2. Open the frontend control room.
3. Type or paste a partial transcript and observe `WAIT`.
4. Add the completing chunk and observe `RETRIEVE`.
5. Review the answer, citations, grounding/conflict status, and telemetry.
6. Upload an audio recording and verify timestamped segments.
7. Upload a new policy document or rebuild the corpus from the Corpus Management panel.

## Current status

The backend and frontend are separated for deployment and maintenance. The backend is independently testable and deployable; the frontend is an independent Next.js application. The root launchers are intended for local development and demo use, while Docker remains available for backend-only deployment.

