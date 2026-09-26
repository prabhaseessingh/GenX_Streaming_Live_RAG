# Project Flow and Developer Handoff

This document explains how the Adaptive Incremental RAG system works and where
future development should happen.

## 1. High-level flow

```text
Transcript/API input
        |
        v
Retrieval Controller
  WAIT / RETRIEVE / NO_RETRIEVE
        |
        v
Intent Decomposition
  one or more subqueries
        |
        v
Parallel Hybrid Retrieval
  BM25 + lexical + deterministic dense
        |
        v
Fusion and Reranking
  RRF + generic scoring + optional CrossEncoder
        |
        v
Evidence-focused synthesis context
        |
        v
LLM answer draft or deterministic fallback
        |
        v
Citation and claim-level grounding validation
        |
        v
Conflict/uncertainty handling
        |
        v
Answer + citations + telemetry
```

## 2. Request lifecycle

The main request endpoint is:

```text
POST /session/{session_id}/chunk
```

The flow is:

1. Load the session from memory or SQLite.
2. Append the incoming transcript text.
3. Run the controller.
4. Return immediately for `WAIT` or `NO_RETRIEVE`.
5. Decompose the request into one or more intents.
6. Search each intent in parallel.
7. Keep the strongest unique evidence chunks for synthesis.
8. Generate an LLM draft when Groq is enabled.
9. Reject drafts with malformed citations, uncited factual bullets, or unsupported claims.
10. Use the deterministic grounded answer if the draft fails validation.
11. Detect conflicting policy values.
12. Persist the session and emit telemetry.

## 3. Important files

| File | Responsibility |
|---|---|
| `app/main.py` | FastAPI app, authentication, rate limiting, API/WebSocket routes |
| `app/session.py` | Session lifecycle, orchestration, refinement, fallback behavior |
| `app/controller.py` | Deterministic `WAIT`/`RETRIEVE`/`NO_RETRIEVE` logic |
| `app/decomposer.py` | Multi-intent decomposition and conservative intent handling |
| `app/retrieval.py` | BM25, lexical, dense, fusion, reranking |
| `app/synthesis.py` | Grounded fallback answers, cleaning, claim validation, conflicts |
| `app/entailment.py` | Optional NLI CrossEncoder validation |
| `app/llm.py` | Groq provider and LLM request handling |
| `app/ingest.py` | PDF/Markdown/JSON ingestion and chunking |
| `app/storage.py` | SQLite session and telemetry persistence |
| `app/telemetry.py` | Structured event creation and persistence |
| `data/raw/` | Source documents and corpus manifest |
| `data/processed/corpus.json` | Canonical runtime corpus |
| `evaluation/` | Benchmark, relevance, and live smoke tests |
| `tests/` | Regression and behavior tests |

## 4. Environment setup

Create a local environment file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Important variables:

```dotenv
GROQ_API_KEY=your-key
GROQ_MODEL=openai/gpt-oss-120b
RAG_DB_PATH=data/rag.sqlite3
RAG_API_KEY=optional-api-key
RAG_RATE_LIMIT_PER_MINUTE=0
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
ENTAILMENT_MODEL=
ENTAILMENT_THRESHOLD=0.55
```

Never commit `.env`.

## 5. Corpus flow

Raw documents are placed in `data/raw/`. The manifest maps source files to
stable document IDs. Rebuild the processed corpus with:

```powershell
python -m app.cli ingest data/raw data/processed
```

The runtime loads `data/processed/corpus.json` by default. Use
`RAG_CORPUS_DIR` to point to another processed corpus.

Raw PDFs are ignored by Git by default. Only commit them if redistribution is
allowed. The processed corpus and manifest are the reproducible handoff files.

## 6. Running and testing

Offline checks:

```powershell
python -m unittest discover -s tests -v
python -m evaluation.benchmark
python -m evaluation.relevance
```

API:

```powershell
python -m uvicorn app.main:app --reload
```

Live LLM smoke test:

```powershell
python -m evaluation.live_llm_smoke
```

Current baseline:

- 23 automated tests
- 6/6 benchmark gates
- 100% top-5 relevance hit rate
- Reproducible retrieval rankings

## 7. Persistence behavior

Sessions and telemetry are stored in `data/rag.sqlite3`. Reusing a session ID
continues the old conversation. Use a new ID for an independent demo.

This is intentional. It also means tests should either use unique session IDs
or use a temporary SQLite database.

## 8. Safety behavior

The system must fail closed:

- Never return an LLM draft with malformed document IDs.
- Never return an uncited factual bullet.
- Never return a draft that fails claim-level evidence validation.
- Use the deterministic grounded fallback when validation fails.
- State when evidence is insufficient.
- Surface conflicting numeric policy values as uncertainty.

Do not weaken these checks to improve answer fluency.

## 9. Recommended next tasks

### Priority 1: Demo and evaluation

- Run the complete clean-session demo.
- Test with the official hackathon corpus when available.
- Record benchmark and relevance metrics.
- Add evaluation questions for newly discovered failure cases.

### Priority 2: Retrieval quality

- Compare deterministic fallback ranking with CrossEncoder ranking.
- Tune generic reranking weights using held-out evaluation questions.
- Improve section-aware PDF table chunking without adding corpus-specific keywords.

### Priority 3: Grounding quality

- Download/configure an NLI CrossEncoder through `ENTAILMENT_MODEL`.
- Compare NLI validation against lexical validation.
- Add contradiction-specific entailment tests.

### Priority 4: Deployment hardening

- Move from in-memory rate limiting to a shared store for multi-instance deployment.
- Add structured request IDs and log redaction.
- Add authentication for WebSocket clients in deployment documentation.
- Add CI to run tests and benchmark gates on every push.

### Priority 5: Product layer

- Build the frontend only after API behavior and evaluation are stable.
- Add streaming transcript visualization and telemetry views.
- Add document/source management for corpus replacement.

## 10. Contribution guidelines

- Keep provider-specific logic in `app/llm.py`.
- Keep retrieval changes in `app/retrieval.py`.
- Keep grounding and citation rules in `app/synthesis.py`.
- Add a regression test for every behavior change.
- Do not hardcode facts from the current policy corpus into the retrieval or answer logic.
- Prefer configurable environment variables over source edits.
- Run the full test and benchmark commands before submitting changes.
