from .models import Claim, Evidence
import re
import os

QUERY_GENERIC_TERMS = {
    "policy", "policies", "university", "travel", "expense", "expenses",
    "reimburse", "reimbursement", "rules", "question", "information", "mission",
}

QUERY_STOP_TERMS = QUERY_GENERIC_TERMS | {
    "what", "which", "where", "when", "how", "is", "are", "for", "and", "does",
    "should", "must", "can", "be", "used", "according", "to",
}

def query_focus_term(query: str) -> str | None:
    """Return the requested object for common ``what ... is required`` forms."""
    match = re.search(r"\b(?:is|are|should|must)?\s*(?:be\s+)?(?:required|used|provided|submitted|covered|allowed)\b", query, re.I)
    if not match:
        return None
    prefix = query[:match.start()]
    terms = [term for term in re.findall(r"[a-z0-9]+", prefix.lower()) if term not in QUERY_STOP_TERMS]
    return terms[-1] if terms else None

def query_focus_anchor(query: str) -> str | None:
    """Return the primary concept immediately before the requested object."""
    match = re.search(r"\b(?:is|are|should|must)?\s*(?:be\s+)?(?:required|used|provided|submitted|covered|allowed)\b", query, re.I)
    if not match:
        return None
    prefix = query[:match.start()]
    terms = [term for term in re.findall(r"[a-z0-9]+", prefix.lower()) if term not in QUERY_STOP_TERMS]
    return terms[-2] if len(terms) >= 2 else (terms[-1] if terms else None)

def clean_answer(text: str) -> str:
    for _ in range(2):
        if not any(marker in text for marker in ("â", "Ã", "Â", "ð")): break
        try:
            repaired = text.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if repaired == text: break
        text = repaired
    replacements = {"â€™": "'", "â€˜": "'", "â€œ": '"', "â€�": '"', "â€“": "-", "â€”": "-", "â¯": " ", "Â": "", "�s": "'s", "\ufffds": "'s", "‑": "-", "’": "'", "‘": "'", "ï§": "\n- ", "âside": "-side"}
    for bad, good in replacements.items(): text = text.replace(bad, good)
    # PDF table bullets may arrive with a different Windows-code-page glyph.
    text = re.sub(r"ï(?:§|\ufffd)", "\n- ", text)
    # Some PDF/model paths drop the middle byte of punctuation sequences,
    # leaving an isolated â between words.
    text = re.sub(r"(?<=\w)â(?=\w)", "-", text)
    # Some clients render the UTF-8 non-breaking-space bytes as ``â¯``
    # (or as ``â`` followed by a different replacement glyph). Treat that
    # artifact as ordinary spacing in the user-facing answer.
    text = re.sub(r"â(?:¯|\u00a0|\ufffd)?", " ", text)
    # Defensive cleanup for variants emitted by different terminal/code-page
    # combinations, e.g. ``â¯`` where the second glyph is not U+00AF.
    text = re.sub(r"â(?=\s|\[[A-Z0-9_]+\]|dollars|euros|pounds)", " ", text, flags=re.I)
    text = text.replace("â ", " ")
    return text

def relevant_excerpt(query: str, text: str, limit: int = 900) -> str:
    """Keep citation-grounded sentences relevant to this subquery."""
    terms = set(re.findall(r"[a-z0-9]+", query.lower())) - {
        "what", "are", "the", "for", "how", "is", "and", "does"
    } - QUERY_GENERIC_TERMS

    # PDF extraction commonly splits the abbreviation ``U.S.`` as if it were
    # a sentence boundary, which creates fragments such as ``based on U.S.``.
    protected = clean_answer(text).replace("U.S.", "U§S§").replace("e.g.", "e§g§")
    sentences = re.split(r"(?<=[.!?])\s+|\n+|\s*[�•▪]\s*", protected)
    sentences = [sentence.replace("U§S§", "U.S.").replace("e§g§", "e.g.") for sentence in sentences]
    focus = query_focus_term(query)
    anchor = query_focus_anchor(query)
    required_term = anchor or focus
    if required_term and not any(required_term in set(re.findall(r"[a-z0-9]+", sentence.lower())) for sentence in sentences):
        return ""
    scored = []
    for index, sentence in enumerate(sentences):
        words = set(re.findall(r"[a-z0-9]+", sentence.lower()))
        overlap = len(terms & words)
        if overlap > 0: scored.append((overlap, index, sentence.strip()))
    scored.sort(key=lambda x: -x[0])
    if not scored:
        return clean_answer(text)[:limit]

    # Prefer the highest-overlap sentence(s). This prevents a shared word such
    # as ``foreign`` from pulling an adjacent foreign-carrier paragraph into a
    # foreign-currency answer.
    best_score = scored[0][0]
    selected = [(index, sentence) for score, index, sentence in scored if score == best_score]
    excerpt_parts = [sentence for _, sentence in selected]
    # Preserve enumerated evidence following a lead-in such as
    # ``required in the form of:`` even when the bullet text itself does not
    # repeat the query terms.
    if selected and selected[0][1].rstrip().endswith(":"):
        next_index = selected[0][0] + 1
        while next_index < len(sentences) and len(excerpt_parts) < 3:
            continuation = sentences[next_index].strip()
            if continuation:
                excerpt_parts.append(continuation)
            next_index += 1
    elif selected and required_term:
        # Include the adjacent supporting sentence when it repeats the focus
        # concept, e.g. the sentence that specifies the exchange-rate print
        # screen after the sentence naming the OANDA rate source.
        next_index = selected[0][0] + 1
        while next_index < len(sentences) and len(excerpt_parts) < 3:
            continuation = sentences[next_index].strip()
            continuation_terms = set(re.findall(r"[a-z0-9]+", continuation.lower()))
            if required_term in continuation_terms:
                excerpt_parts.append(continuation)
            next_index += 1
    excerpt = " ".join(excerpt_parts)[:limit]
    return excerpt[:limit] if excerpt else clean_answer(text)[:limit]

def grounded_answer(subqueries: list[dict], evidence: dict[str, list[Evidence]]) -> tuple[str, list[Claim]]:
    claims = []
    lines = []
    for q in subqueries:
        hits = evidence.get(q["id"], [])
        if not hits:
            display_query = re.sub(r"^\s*for\s+", "", q["query"], flags=re.I)
            lines.append(f"For {display_query}: the provided corpus does not contain enough information to verify this.")
            continue
        top = hits[0]
        citation = top.chunk.chunk_id
        excerpt = relevant_excerpt(q["query"], top.chunk.text)
        claim = Claim(f"C{len(claims)+1}", excerpt, [citation], [q["intent"]])
        claims.append(claim)
        source = f" ({top.chunk.title})" if top.chunk.title else ""
        display_query = re.sub(r"^\s*for\s+", "", q["query"], flags=re.I)
        lines.append(f"For {display_query}{source}: {excerpt} [{citation}]")
    return "\n".join(lines), claims

def _content_words(text: str) -> set[str]:
    stop = {"the", "and", "for", "that", "with", "from", "this", "must", "will", "using", "into", "are", "was", "may", "can", "its", "their", "then", "than", "when", "each"}
    return {word for word in re.findall(r"[a-z]{3,}", text.lower()) if word not in stop}


def validate(answer: str, claims: list[Claim], evidence: dict[str, list[Evidence]] | None = None, entailment=None) -> dict:
    """Validate grounding per cited answer bullet when evidence is available."""
    cited = {c for claim in claims for c in claim.citations}
    evidence_by_id = {}
    if evidence:
        for items in evidence.values():
            for item in items:
                evidence_by_id[item.chunk.chunk_id] = item.chunk.text

    # LLM answers normally contain one factual bullet per line. Validate each
    # cited line independently instead of counting the whole answer as one
    # deterministic claim.
    segments = [line.strip() for line in answer.splitlines() if re.search(r"\[[A-Z0-9_]+\]", line)]
    checks = []
    semantic_scores = []
    if evidence_by_id and segments:
        for segment in segments:
            ids = re.findall(r"\[([^\[\]]+)\]", segment)
            claim_words = _content_words(re.sub(r"\[[^\[\]]+\]", "", segment))
            valid = False
            for citation in ids:
                source_words = _content_words(evidence_by_id.get(citation, ""))
                lexical_support = citation in evidence_by_id and len(claim_words & source_words) >= 2
                semantic_score = entailment.score(evidence_by_id[citation], segment) if lexical_support and entailment else None
                if semantic_score is not None:
                    semantic_scores.append(semantic_score)
                threshold = float(os.getenv("ENTAILMENT_THRESHOLD", "0.55"))
                if lexical_support and (semantic_score is None or semantic_score >= threshold):
                    valid = True
                    break
            checks.append(valid)
        supported = sum(checks)
        unsupported = len(checks) - supported
        total = len(checks)
    else:
        supported = sum(1 for claim in claims if claim.citations and all(c in answer for c in claim.citations))
        total = len(claims)
        unsupported = total - supported
    return {
        "valid": unsupported == 0,
        "supported_claims": supported,
        "unsupported_claims": unsupported,
        "total_claims": total,
        "grounding_rate": supported / total if total else 1.0,
        "citations": sorted(cited),
        "uncertainty": unsupported > 0,
        "semantic_validation": bool(semantic_scores),
        "mean_entailment_score": sum(semantic_scores) / len(semantic_scores) if semantic_scores else None,
    }

def detect_conflicts(evidence: dict[str, list[Evidence]], claims: list[Claim] | None = None) -> list[dict]:
    """Flag numeric conflicts that are relevant to the answer claims.

    When claims are supplied, unrelated numbers in neighboring retrieved
    chunks are ignored. The one-argument form remains available for offline
    retrieval/conflict tests.
    """
    conflicts = []
    claim_terms = [_content_words(claim.text) for claim in claims or []]
    for query_id, items in evidence.items():
        numeric = {}
        for item in items[:5]:
            if claim_terms:
                item_terms = _content_words(item.chunk.text)
                if not any(len(item_terms & terms) >= 2 for terms in claim_terms):
                    continue
            # Ignore page numbers, dates, section numbering, and unrelated
            # numerals. Only compare numbers attached to policy quantities.
            matches = re.findall(r"(?:\b\d+(?:\.\d+)?%?\s*(?:days?|hours?|miles?|percent|%)|[$€£]\s*\d+(?:\.\d+)?)", item.chunk.text, re.I)
            values = tuple(matches)
            if values: numeric[item.chunk.chunk_id] = values
        distinct = {values for values in numeric.values()}
        if len(distinct) > 1:
            conflicts.append({"subquery_id": query_id, "chunks": sorted(numeric), "values": [list(v) for v in distinct]})
    return conflicts
