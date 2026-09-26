# API reference

## Authentication and rate limiting

Set `RAG_API_KEY` to require the `X-API-Key` header on HTTP endpoints:

```powershell
$env:RAG_API_KEY = "local-demo-secret"
```

Optionally set `RAG_RATE_LIMIT_PER_MINUTE` to limit requests per client IP.
Both controls are disabled by default for local development.

## `GET /health`

Returns service status, corpus size, active model, and code version.

## `POST /session/{session_id}/chunk`

Request:

```json
{"text":"What are the foreign currency reimbursement rules?"}
```

The response contains `decision`, `answer`, `citations`, `version`, and
`telemetry`. The controller decisions are `WAIT`, `RETRIEVE`, and
`NO_RETRIEVE`.

## `GET /session/{session_id}/events`

Returns structured events such as controller decisions, subqueries, search
latency, LLM usage, draft acceptance/rejection, delta retrieval, and citation
validation.

## WebSocket

Connect to `ws://127.0.0.1:8000/ws/session/{session_id}` and send the same JSON
payload as the HTTP endpoint. Each message receives the same response shape.
