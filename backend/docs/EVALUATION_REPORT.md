# Evaluation and Alignment Report

## Current baseline

The local corpus contains 359 processed chunks from the supplied policy
documents. The following results were recorded from the latest clean rebuild
and evaluation run on 2026-09-30:

| Metric | Result |
|---|---:|
| Automated regression tests | 34 passed |
| Benchmark gates | 6/6 |
| Early retrieval gate | 100% |
| Multi-intent gate | 100% |
| Grounding gate | 100% |
| Telemetry gate | 100% |
| Top-5 retrieval hit rate | 100% |
| Mean precision@5 | 62.5% |
| Mean recall@5 | 72.2% |
| MRR@5 | 61.7% |

These are local development results, not results on the private hackathon
corpus.

## Alignment with the track

Implemented: controller decisions, incremental text chunks, multi-intent
decomposition, parallel retrieval, hybrid fusion, reranking, session-aware
refinement, citations, uncertainty, claim validation, telemetry, and
reproducible evaluation.

Remaining validation work: replay against the official held-out corpus, audio
latency measurement, and formal ablations.

## Required ablations

Run the following on the same question set and record the output metrics:

1. BM25-only versus fused BM25 + lexical + dense retrieval.
2. Deterministic controller versus Groq controller.
3. Deterministic reranking versus CrossEncoder reranking when the model is available.
4. Lexical claim validation versus NLI claim validation when configured.

Each ablation should report hit rate, precision@5, recall@5, MRR, latency, and
grounding rate. Do not compare runs using different corpora or question sets.

## Failure cases to include in the submission

- Malformed LLM citations: draft rejected and grounded fallback returned.
- Unsupported question: explicit insufficient-evidence answer.
- Conflicting policy numeric values: uncertainty flag emitted.
- Late constraint: delta retrieval and answer version increment.
- Presentation-only request: no new retrieval.

## Reproducibility

The dense fallback uses stable SHA-256 term buckets rather than Python's
process-randomized hash. Use `RAG_SESSION_PERSISTENCE=ephemeral` for isolated
benchmark runs and `sqlite` when demonstrating restart recovery.
