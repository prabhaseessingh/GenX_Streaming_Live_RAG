from .controller import decide
from .decomposer import decompose
from .models import SessionState
from .synthesis import grounded_answer, validate, detect_conflicts, clean_answer
from .entailment import EntailmentChecker
import re
import time
import re

class SessionManager:
    def __init__(self, retriever, telemetry, llm=None, store=None):
        self.retriever, self.telemetry, self.llm, self.store = retriever, telemetry, llm, store
        self.entailment = EntailmentChecker()
        self.sessions = {}

    def get(self, session_id):
        if session_id not in self.sessions:
            self.sessions[session_id] = (self.store.load_session(session_id) if self.store else None) or SessionState(session_id)
        return self.sessions[session_id]

    def save(self, state):
        if self.store:
            self.store.save_session(state)

    def ingest(self, session_id: str, text: str):
        state = self.get(session_id)
        state.transcript = f"{state.transcript} {text}".strip()
        self.telemetry.emit(session_id, "TRANSCRIPT_CHUNK", text=text)
        # Controller evaluates the newly arrived turn so presentation-only
        # requests are not confused by constraints in earlier transcript text.
        llm_active = bool(self.llm)
        try:
            decision = self.llm.decide(text, state.answer) if self.llm else decide(text, state.answer)
            if self.llm: self.telemetry.emit(session_id, "LLM_USAGE", stage="controller", model=self.llm.model, latency_ms=self.llm.last_latency_ms, usage=self.llm.last_usage)
        except Exception as exc:
            llm_active = False
            self.telemetry.emit(session_id, "LLM_ERROR", stage="controller", error_type=type(exc).__name__, error=str(exc)[:300])
            decision = decide(text, state.answer)
        self.telemetry.emit(session_id, "CONTROLLER_DECISION", decision=decision.decision, confidence=decision.confidence, reason=decision.reason)
        if decision.decision == "WAIT":
            self.save(state)
            return {"decision": decision.__dict__, "answer": state.answer}
        if decision.decision == "NO_RETRIEVE":
            state.answer = clean_answer("\n".join(f"- {line}" for line in state.answer.splitlines()))
            self.save(state)
            self.telemetry.emit(session_id, "NO_RETRIEVE", reason=decision.reason)
            return {"decision": decision.__dict__, "answer": state.answer, "version": state.answer_version}
        is_delta = bool(state.answer and re.search(r"\b(actually|instead|international|domestic|after travel|before travel|change|changed)\b|\b\d+\b", text, re.I))
        query_text = text if is_delta else state.transcript
        try:
            subqueries = self.llm.decompose(query_text) if llm_active else decompose(query_text)
            if llm_active: self.telemetry.emit(session_id, "LLM_USAGE", stage="decomposer", model=self.llm.model, latency_ms=self.llm.last_latency_ms, usage=self.llm.last_usage)
        except Exception as exc:
            llm_active = False
            self.telemetry.emit(session_id, "LLM_ERROR", stage="decomposer", error_type=type(exc).__name__, error=str(exc)[:300])
            subqueries = decompose(query_text)
        if is_delta:
            self.telemetry.emit(session_id, "DELTA_RETRIEVAL_STARTED", changed_text=text)
        self.telemetry.emit(session_id, "SUBQUERIES_CREATED", count=len(subqueries), subqueries=subqueries)
        evidence = {}
        # Retrieve all current sub-intents concurrently when the retriever
        # supports it; this keeps compound requests latency-bounded by the
        # slowest sub-query rather than the sum of all searches.
        if hasattr(self.retriever, "search_parallel"):
            search_started = time.perf_counter()
            results = self.retriever.search_parallel([q["query"] for q in subqueries])
            search_latency_ms = round((time.perf_counter() - search_started) * 1000, 2)
            for q, hits in zip(subqueries, results):
                evidence[q["id"]] = hits
                self.telemetry.emit(session_id, "SEARCH_STARTED", query=q["query"], subquery_id=q["id"])
                self.telemetry.emit(session_id, "SEARCH_COMPLETED", subquery_id=q["id"], results=len(hits))
            self.telemetry.emit(session_id, "RETRIEVAL_LATENCY", latency_ms=search_latency_ms, subquery_count=len(subqueries))
        else:
            for q in subqueries:
                self.telemetry.emit(session_id, "SEARCH_STARTED", query=q["query"], subquery_id=q["id"])
                evidence[q["id"]] = self.retriever.search(q["query"])
                self.telemetry.emit(session_id, "SEARCH_COMPLETED", subquery_id=q["id"], results=len(evidence[q["id"]]))

        # Keep the synthesis context focused: top two unique chunks per
        # subquery, with a bounded text size. Retrieval may return five
        # candidates for evaluation, but the LLM should see only the strongest
        # evidence to reduce unrelated policy spillover and token cost.
        for query_id, hits in evidence.items():
            seen = set()
            focused = []
            for hit in hits:
                if hit.chunk.chunk_id in seen: continue
                seen.add(hit.chunk.chunk_id)
                hit.chunk.text = hit.chunk.text[:1800]
                focused.append(hit)
                if len(focused) == 2: break
            evidence[query_id] = focused
        answer, claims = grounded_answer(subqueries, evidence)
        grounded_fallback_answer, grounded_fallback_claims = answer, claims
        answer = clean_answer(answer)
        llm_draft_used = False
        if llm_active:
            # Use the model for drafting, but retain deterministic claims and
            # validation as the source of truth for citation integrity.
            try:
                drafted = clean_answer(self.llm.synthesize(subqueries, evidence).strip())
                self.telemetry.emit(session_id, "LLM_USAGE", stage="synthesis", model=self.llm.model, latency_ms=self.llm.last_latency_ms, usage=self.llm.last_usage)
                valid_ids = {item.chunk.chunk_id for hits in evidence.values() for item in hits}
                cited_ids = set(re.findall(r"\[([^\[\]]+)\]", drafted))
                invalid_ids = {item for item in cited_ids if item not in valid_ids}
                # A model may emit malformed citation delimiters such as
                # `ãDOC_...ã`. Treat every document ID outside exact brackets
                # as a formatting/grounding failure.
                raw_doc_ids = set(re.findall(r"DOC_[A-Z0-9_]+", drafted))
                malformed_ids = raw_doc_ids - cited_ids
                # Require each factual bullet/numbered line to carry a source.
                factual_lines = [line.strip() for line in drafted.splitlines() if re.match(r"^(?:[-*]|\d+[.)])\s+", line)]
                uncited_lines = [line for line in factual_lines if not re.search(r"\[[^\[\]]+\]", line)]
                if drafted and not invalid_ids and not malformed_ids and not uncited_lines:
                    answer = drafted
                    llm_draft_used = True
                    self.telemetry.emit(session_id, "LLM_DRAFT_ACCEPTED", citations=sorted(cited_ids))
                else:
                    self.telemetry.emit(session_id, "LLM_DRAFT_REJECTED", invalid_citations=sorted(invalid_ids), malformed_citations=sorted(malformed_ids), uncited_lines=len(uncited_lines))
            except Exception as exc:
                self.telemetry.emit(session_id, "LLM_ERROR", stage="synthesis", error_type=type(exc).__name__, error=str(exc)[:300])
        if is_delta:
            # Replace only claims whose dependency matches a new intent. A
            # generic constraint (e.g. "international") is additive; a
            # capacity/cancellation change replaces the old claim in-place.
            new_intents = {q["intent"] for q in subqueries}
            affected = []
            preserved = []
            for old in state.claims:
                if any(dep in new_intents or dep.split(" + ")[0] in new_intents for dep in old.dependencies):
                    affected.append(old)
                else:
                    preserved.append(old)
            claims = preserved + claims
            rendered = []
            for claim in claims:
                rendered.append(f"{claim.text} [{claim.citations[0]}]")
            answer = "\n".join(rendered)
            llm_draft_used = False
            self.telemetry.emit(session_id, "DELTA_RETRIEVAL_COMPLETED", affected_claims=len(affected), preserved_claims=len(preserved))
        state.answer_version += 1
        state.answer, state.claims = answer, claims
        state.intents = [q["intent"] for q in subqueries]
        validation = validate(answer, claims, evidence, self.entailment)
        answer_citations = set(re.findall(r"\[([^\[\]]+)\]", answer))
        evidence_ids = {item.chunk.chunk_id for hits in evidence.values() for item in hits}
        evidence_ids.update(citation for claim in state.claims for citation in claim.citations)
        validation["citations"] = sorted(answer_citations & evidence_ids) if answer_citations else validation["citations"]
        validation["citation_integrity"] = not bool(answer_citations - evidence_ids)
        validation["uncertainty"] = validation["uncertainty"] or not validation["citation_integrity"]
        conflicts = detect_conflicts(evidence)
        validation["conflicts"] = conflicts
        validation["uncertainty"] = validation["uncertainty"] or bool(conflicts)
        # Fail closed on grounding: an LLM draft that passes citation syntax
        # but fails claim-level evidence validation must not reach the client.
        if llm_draft_used and validation["unsupported_claims"] > 0:
            self.telemetry.emit(session_id, "LLM_DRAFT_REJECTED", reason="claim_validation_failed", unsupported_claims=validation["unsupported_claims"])
            answer = clean_answer(grounded_fallback_answer)
            claims = grounded_fallback_claims
            validation = validate(answer, claims, evidence, self.entailment)
            answer_citations = set(re.findall(r"\[([^\[\]]+)\]", answer))
            validation["citations"] = sorted(answer_citations & evidence_ids) if answer_citations else validation["citations"]
            validation["citation_integrity"] = not bool(answer_citations - evidence_ids)
            validation["uncertainty"] = validation["uncertainty"] or not validation["citation_integrity"]
        if conflicts:
            answer += "\nUncertainty: the retrieved policy documents contain potentially conflicting numeric details; review the cited sources before acting."
        # Final response boundary: normalize both deterministic and accepted
        # LLM drafts after all answer composition has completed. This also
        # covers text appended by conflict/uncertainty handling.
        answer = clean_answer(answer)
        state.answer = answer
        self.telemetry.emit(session_id, "ANSWER_GENERATED", version=state.answer_version)
        self.telemetry.emit(session_id, "CITATION_VALIDATED", **validation)
        self.save(state)
        return {"decision": decision.__dict__, "answer": answer, "citations": validation["citations"], "version": state.answer_version, "telemetry": self.telemetry.for_session(session_id)}
