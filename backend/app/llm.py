"""Optional Groq provider. No API key means the deterministic pipeline is used."""
import json
import os
import urllib.request
import urllib.error
import time
from .models import RetrievalDecision

class GroqProvider:
    def __init__(self, api_key: str, model: str | None = None):
        self.api_key = api_key
        self.model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.endpoint = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions")
        self.last_usage = {}
        self.last_latency_ms = 0.0

    def complete(self, system: str, user: str, schema: dict | None = None) -> str:
        body = {"model": self.model, "temperature": 0, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        # Do not require provider/model-specific structured-output support.
        # JSON-only prompting keeps this compatible with free-tier models;
        # callers still parse and validate the response locally.
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "adaptive-incremental-rag/0.1",
            },
            method="POST",
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:500]
            raise RuntimeError(f"Groq HTTP {exc.code} model={self.model}: {detail}") from exc
        self.last_latency_ms = round((time.perf_counter() - started) * 1000, 2)
        self.last_usage = payload.get("usage", {}) or {}
        return payload["choices"][0]["message"]["content"]

    def decide(self, text: str, previous_answer: str) -> RetrievalDecision:
        raw = self.complete("Return JSON only. Decide WAIT, RETRIEVE, or NO_RETRIEVE for a streaming RAG turn. Use NO_RETRIEVE only for presentation changes to an existing answer. Do not invent missing facts.", json.dumps({"transcript_chunk": text, "previous_answer": previous_answer}, ensure_ascii=False), {"decision": "string", "confidence": "number", "reason": "string"})
        data = json.loads(raw)
        decision = data.get("decision", "WAIT")
        if decision not in {"WAIT", "RETRIEVE", "NO_RETRIEVE"}: decision = "WAIT"
        return RetrievalDecision(decision, float(data.get("confidence", .5)), data.get("intent", ""), data.get("reason", "LLM controller"), data.get("changed_information", []))

    def decompose(self, text: str) -> list[dict]:
        raw = self.complete("Return JSON only as {\"sub_queries\":[{\"id\":\"Q1\",\"intent\":\"...\",\"query\":\"...\",\"priority\":1}]}. Split only independent factual intents. Preserve shared constraints. Do not add facts.", text, {"sub_queries": "array"})
        data = json.loads(raw)
        return data.get("sub_queries", []) or [{"id": "Q1", "intent": "general", "query": text, "priority": 1}]

    def synthesize(self, subqueries: list[dict], evidence: dict) -> str:
        context = [{"subquery": q, "evidence": [{"chunk_id": e.chunk.chunk_id, "doc_id": e.chunk.doc_id, "source": e.chunk.title or e.chunk.category, "text": e.chunk.text} for e in evidence.get(q["id"], [])]} for q in subqueries]
        return self.complete("Answer only from the supplied evidence. Every factual sentence must end with one or more exact chunk IDs in brackets. If evidence is insufficient, say so explicitly. Never invent citations or facts.", json.dumps(context, ensure_ascii=False), None)

def build_provider():
    key = os.getenv("GROQ_API_KEY")
    return GroqProvider(key) if key else None
