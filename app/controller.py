import re
from .models import RetrievalDecision

PRESENTATION = re.compile(r"\b(bullet points|summari[sz]e|rephrase|rewrite|format|shorten|make it clearer)\b", re.I)
QUESTION = re.compile(r"\b(what|which|where|when|how|can|does|do|is|are|find|tell|policy|available)\b", re.I)

def decide(transcript: str, previous: str = "") -> RetrievalDecision:
    text = transcript.strip()
    if not text:
        return RetrievalDecision("WAIT", .99, reason="empty transcript")
    has_new_constraint = bool(re.search(r"\b(international|domestic|after travel|before travel|actually|instead|change|changed|\d+)\b", text, re.I))
    if PRESENTATION.search(text) and previous and not has_new_constraint:
        return RetrievalDecision("NO_RETRIEVE", .98, intent="presentation transformation", reason="existing answer can be transformed")
    words = text.split()
    has_entity = bool(re.search(r"\b\d+\b|\b(in|at|from|for)\s+[A-Za-z]+", text, re.I))
    has_domain_signal = bool(re.search(r"\b(policy|rules?|reimbursement|cancellation|catering|venue|capacity|travel)\b", text, re.I))
    if len(words) < 5 or (not QUESTION.search(text) and not has_entity and not has_domain_signal):
        return RetrievalDecision("WAIT", .65, reason="insufficient stable intent")
    confidence = min(.95, .55 + .04 * len(words) + (.12 if has_entity else 0))
    return RetrievalDecision("RETRIEVE", confidence, intent=text, reason="stable searchable intent")
