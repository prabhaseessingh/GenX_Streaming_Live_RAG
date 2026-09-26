from .models import Claim, Evidence
import re
import os

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
    terms = set(re.findall(r"[a-z0-9]+", query.lower())) - {"what", "are", "the", "for", "how", "is", "and", "does"}
    sentences = re.split(r"(?<=[.!?])\s+|\n+", clean_answer(text))
    scored = []
    for sentence in sentences:
        words = set(re.findall(r"[a-z0-9]+", sentence.lower()))
        overlap = len(terms & words)
        if overlap > 0: scored.append((overlap, sentence.strip()))
    scored.sort(key=lambda x: -x[0])
    excerpt = " ".join(sentence for _, sentence in scored[:4])
    return excerpt[:limit] if excerpt else clean_answer(text)[:limit]

def grounded_answer(subqueries: list[dict], evidence: dict[str, list[Evidence]]) -> tuple[str, list[Claim]]:
    claims = []
    lines = []
    for q in subqueries:
        hits = evidence.get(q["id"], [])
        if not hits:
            lines.append(f"For {q['query']}: the provided corpus does not contain enough information to verify this.")
            continue
        top = hits[0]
        citation = top.chunk.chunk_id
        excerpt = relevant_excerpt(q["query"], top.chunk.text)
        claim = Claim(f"C{len(claims)+1}", excerpt, [citation], [q["intent"]])
        claims.append(claim)
        source = f" ({top.chunk.title})" if top.chunk.title else ""
        lines.append(f"For {q['query']}{source}: {excerpt} [{citation}]")
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

def detect_conflicts(evidence: dict[str, list[Evidence]]) -> list[dict]:
    """Flag potentially conflicting numeric policy facts for human/LLM review."""
    conflicts = []
    for query_id, items in evidence.items():
        numeric = {}
        for item in items[:5]:
            # Ignore page numbers, dates, section numbering, and unrelated
            # numerals. Only compare numbers attached to policy quantities.
            matches = re.findall(r"(?:\b\d+(?:\.\d+)?%?\s*(?:days?|hours?|miles?|percent|%)|[$€£]\s*\d+(?:\.\d+)?)", item.chunk.text, re.I)
            values = tuple(matches)
            if values: numeric[item.chunk.chunk_id] = values
        distinct = {values for values in numeric.values()}
        if len(distinct) > 1:
            conflicts.append({"subquery_id": query_id, "chunks": sorted(numeric), "values": [list(v) for v in distinct]})
    return conflicts
