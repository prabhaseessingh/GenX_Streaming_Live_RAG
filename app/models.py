from dataclasses import dataclass, field
from typing import Literal

Decision = Literal["WAIT", "RETRIEVE", "NO_RETRIEVE"]

@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    section: str
    page: int | None
    text: str
    title: str = ""
    category: str = ""
    source_url: str = ""

@dataclass
class Evidence:
    chunk: Chunk
    score: float
    rank: int = 0

@dataclass
class RetrievalDecision:
    decision: Decision
    confidence: float
    intent: str = ""
    reason: str = ""
    changed_information: list[str] = field(default_factory=list)

@dataclass
class Claim:
    claim_id: str
    text: str
    citations: list[str]
    dependencies: list[str] = field(default_factory=list)

@dataclass
class SessionState:
    session_id: str
    transcript: str = ""
    constraints: dict[str, str] = field(default_factory=dict)
    intents: list[str] = field(default_factory=list)
    claims: list[Claim] = field(default_factory=list)
    answer: str = ""
    answer_version: int = 0
