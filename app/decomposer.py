import re

INTENT_PATTERNS = [
    ("capacity", r"\b(capacity|accommodate|attendees|people|rooms?|seats?)\b"),
    ("cancellation", r"\b(cancel|cancellation|refund|fee|penalt(?:y|ies))\b"),
    ("catering", r"\b(cater(?:ing|ed)|food|meal|refreshment)\b"),
    ("eligibility", r"\b(eligible|eligibility|qualify|allowed|permitted)\b"),
    ("approval", r"\b(approval|approve|authorization|authorise|authorize)\b"),
    ("reimbursement", r"\b(reimburse|reimbursement|expense|receipt|claim)\b"),
]

def _intent(text: str) -> str:
    found = [name for name, pattern in INTENT_PATTERNS if re.search(pattern, text, re.I)]
    return found[0] if len(found) == 1 else (" + ".join(found) if found else "general")

def _meaningful_clauses(text: str) -> list[str]:
    # Only split on strong boundaries. Commas alone usually separate shared
    # context ("in Pune, for 30 people") rather than separate questions.
    intent_starters = r"what|whether|if|can|does|is|are|tell|find|which|how|cancellation|catering|refund|capacity|approval|reimbursement|eligibility"
    for term in ("catering", "capacity", "cancellation", "refund", "approval", "reimbursement", "eligibility"):
        text = re.sub(" and " + term + r"\b", "; " + term, text, flags=re.I)
    boundary = rf"\s*(?:;|\?|\balso\b|\band\s+(?=(?:{intent_starters})(?:\b|\s)))\s*"
    clauses = re.split(boundary, text, flags=re.I)
    expanded = []
    for clause in clauses:
        pieces = re.split(r"\s+and\s+", clause, flags=re.I)
        if len(pieces) > 1 and _intent(pieces[-1]) != "general":
            expanded.extend(pieces)
        else:
            expanded.append(clause)
    clauses = expanded
    clauses = [re.sub(r"^[,\s]+|[.\s]+$", "", c) for c in clauses]
    clauses = [c for c in clauses if len(c.split()) >= 2]
    if len(clauses) <= 1:
        return [text.strip()]
    # Merge fragments that carry no new intent with the preceding clause.
    output = []
    for clause in clauses:
        if output and _intent(clause) == "general" and not re.search(r"\b(what|whether|if|can|does|is|are|tell|find|which|how)\b", clause, re.I):
            output[-1] += " " + clause
        else:
            output.append(clause)
    return output

def decompose(text: str) -> list[dict]:
    text = re.sub(r"\s+", " ", text).strip()
    parts = _meaningful_clauses(text)
    # Shared entities/constraints are intentionally retained in every query
    # because each sub-query must remain meaningful when retrieved alone.
    shared = ""
    location = re.search(r"\b(?:in|at|from)\s+[A-Z][\w-]+", text)
    quantity = re.search(r"\b\d+\s+(?:people|attendees|rooms?|days?)\b", text, re.I)
    if location: shared += " " + location.group(0)
    if quantity: shared += " " + quantity.group(0)
    output = []
    for i, part in enumerate(parts, 1):
        query = part
        if shared and not all(term.lower() in part.lower() for term in shared.split()):
            query = part + shared
        output.append({"id": f"Q{i}", "intent": _intent(part), "query": query.strip(), "priority": i})
    return output
