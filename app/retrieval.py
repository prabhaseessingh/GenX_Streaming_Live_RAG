import math
import re
import hashlib
import os
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from .models import Chunk, Evidence

STOP = {"the", "a", "an", "and", "or", "to", "of", "in", "for", "is", "what", "are", "me", "tell", "about"}
# Broad request vocabulary is useful for matching, but it is not evidence of
# a specific answer. Keep it out of the unsupported-query relevance gate.
GENERIC_QUERY_TERMS = {
    "policy", "policies", "university", "travel", "expense", "expenses",
    "reimburse", "reimbursement", "rules", "question", "information", "mission", "according",
}

def tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]

class HybridRetriever:
    """Dependency-free baseline. Dense/BM25 adapters can implement the same API."""
    def __init__(self, chunks: list[Chunk]):
        self.chunks = chunks
        self.doc_freq = Counter(t for c in chunks for t in set(tokens(c.text + " " + c.section)))

    def search(self, query: str, top_k: int = 5) -> list[Evidence]:
        q = set(tokens(query))
        scored = []
        for chunk in self.chunks:
            # Metadata is searchable too: users ask for concepts such as
            # "cancellation policy" that may be expressed in a section title.
            ct = tokens(chunk.text + " " + chunk.section)
            overlap = len(q.intersection(ct))
            if overlap:
                rarity = sum(1 / self.doc_freq[t] for t in q.intersection(ct))
                score = overlap + rarity
                scored.append(Evidence(chunk, score))
        scored.sort(key=lambda x: (-x.score, x.chunk.chunk_id))
        for i, item in enumerate(scored[:top_k], 1): item.rank = i
        return scored[:top_k]

class BM25Retriever:
    """Small self-contained BM25 implementation for reproducible local runs."""
    def __init__(self, chunks: list[Chunk], k1: float = 1.5, b: float = .75):
        self.chunks, self.k1, self.b = chunks, k1, b
        self.docs = [tokens(c.text + " " + c.section) for c in chunks]
        self.avg_len = sum(map(len, self.docs)) / max(1, len(self.docs))
        self.df = Counter(t for doc in self.docs for t in set(doc))

    def search(self, query: str, top_k: int = 10) -> list[Evidence]:
        q = tokens(query)
        scored = []
        n = len(self.docs)
        for chunk, doc in zip(self.chunks, self.docs):
            counts = Counter(doc)
            score = 0.0
            for term in q:
                if not counts[term]: continue
                idf = math.log(1 + (n - self.df[term] + .5) / (self.df[term] + .5))
                norm = 1 - self.b + self.b * len(doc) / max(1, self.avg_len)
                score += idf * counts[term] * (self.k1 + 1) / (counts[term] + self.k1 * norm)
            if score > 0: scored.append(Evidence(chunk, score))
        scored.sort(key=lambda x: (-x.score, x.chunk.chunk_id))
        for i, item in enumerate(scored[:top_k], 1): item.rank = i
        return scored[:top_k]

def reciprocal_rank_fusion(result_sets: list[list[Evidence]], top_k: int = 8, k: int = 60) -> list[Evidence]:
    merged = {}
    for results in result_sets:
        for rank, item in enumerate(results, 1):
            key = item.chunk.chunk_id
            if key not in merged: merged[key] = Evidence(item.chunk, 0.0)
            merged[key].score += 1 / (k + rank)
    output = sorted(merged.values(), key=lambda x: (-x.score, x.chunk.chunk_id))[:top_k]
    for i, item in enumerate(output, 1): item.rank = i
    return output

class FusedRetriever:
    def __init__(self, chunks: list[Chunk]):
        self.chunks = chunks
        self.sparse = BM25Retriever(chunks)
        self.lexical = HybridRetriever(chunks)
        self.dense = DenseRetriever(chunks)
        self.semantic = SemanticReranker()

    def search(self, query: str, top_k: int = 5) -> list[Evidence]:
        fused = reciprocal_rank_fusion([
            self.sparse.search(query, top_k * 2),
            self.lexical.search(query, top_k * 2),
            self.dense.search(query, top_k * 2),
        ], top_k * 2)
        # Lightweight reranking: exact query-term coverage and source-name
        # matches break ties created by broad policy vocabulary overlap.
        q = set(tokens(query))
        generic = {"policy", "travel", "rules", "expenses", "foreign", "currency", "reimbursement", "what", "does", "say", "about", "university"}
        proper_terms = {term.lower() for term in re.findall(r"\b[A-Z][a-z]{3,}\b", query)}
        source_hints = {term for term in proper_terms if term not in generic and term not in {"what", "How", "Which", "Tell"}}
        hinted = [item for item in fused if source_hints & set(tokens(" ".join([item.chunk.title, item.chunk.category, item.chunk.doc_id])))]
        if source_hints and not hinted:
            # Recover source matches that broad retrieval may have pruned.
            hinted_chunks = [c for c in self.chunks if source_hints & set(tokens(" ".join([c.title, c.category, c.doc_id])))]
            hinted = self.sparse.search(query, top_k * 2)
            hinted.extend(Evidence(c, 0.5) for c in hinted_chunks if c.chunk_id not in {x.chunk.chunk_id for x in hinted})
        if hinted:
            fused = hinted
        rescored = []
        for item in fused:
            metadata = tokens(" ".join([item.chunk.title, item.chunk.category, item.chunk.doc_id]))
            body_tokens = set(tokens(item.chunk.text))
            section_tokens = set(tokens(item.chunk.section + " " + item.chunk.title))
            text = body_tokens | section_tokens
            coverage = len(q & text) / max(1, len(q))
            section_coverage = len(q & section_tokens) / max(1, len(q))
            phrase = " ".join(tokens(query))
            phrase_match = 1.0 if phrase and phrase in " ".join(tokens(item.chunk.text)) else 0.0
            source_match = len(q & set(metadata))
            # A named organization is a strong routing signal; generic policy
            # terms should not outweigh an explicit source in the query.
            # Section/title coverage and exact phrase matches are generic
            # signals that improve the offline fallback when CrossEncoder is
            # unavailable, without relying on corpus-specific vocabulary.
            item.score += .45 * coverage + .35 * section_coverage + .25 * phrase_match + 1.5 * source_match
            rescored.append(item)
        rescored.sort(key=lambda x: (-x.score, x.chunk.chunk_id))
        rescored = self.semantic.rerank(query, rescored, top_k * 2)
        query_terms = set(tokens(query))

        # Section labels extracted from PDFs can be attached to the next
        # paragraph after a page/table break. Verify the actual chunk body
        # before allowing a section-only match to become evidence.
        specific_terms = query_terms - GENERIC_QUERY_TERMS
        if len(specific_terms) >= 2:
            body_relevant = []
            for item in rescored:
                body_terms = set(tokens(" ".join([
                    item.chunk.text,
                    item.chunk.title,
                    item.chunk.doc_id,
                ])))
                section_terms = set(tokens(item.chunk.section))
                section_only_match = not (specific_terms & body_terms) and bool(specific_terms & section_terms)
                if not section_only_match:
                    body_relevant.append(item)
            rescored = body_relevant

        # Relevance gate: broad policy words can produce plausible-looking
        # hits for unsupported questions. Use corpus statistics rather than
        # corpus-specific keywords to require coverage of enough distinctive
        # query terms. This keeps generic words such as "policy" and
        # "reimbursement" from grounding an unrelated answer.
        rare_limit = max(3, int(len(self.chunks) * 0.08))
        out_of_corpus = {term for term in query_terms if self.sparse.df.get(term, 0) == 0}
        source_hint_terms = {
            term.lower() for term in re.findall(r"\b[A-Z][a-z]{3,}\b", query)
        }
        known_non_generic = {
            term for term in query_terms
            if term not in out_of_corpus
            and term not in GENERIC_QUERY_TERMS
            and term not in source_hint_terms
        }
        distinctive = {
            term for term in query_terms
            if term not in GENERIC_QUERY_TERMS
            and 0 < self.sparse.df.get(term, 0) <= rare_limit
        }

        # A single unknown term can be a location, name, or user-specific
        # constraint, so it must not suppress otherwise useful evidence. Two
        # or more unknown terms are a stronger unsupported-query signal. When
        # that happens, require at least two corpus-known distinctive terms to
        # appear in a candidate; otherwise return no evidence.
        # A single unknown modifier is also unsupported when every remaining
        # term is generic (for example, ``lunar reimbursement travel``). This
        # does not reject normal location/name queries because those retain a
        # known non-generic term such as venue, receipts, mileage, or currency.
        if out_of_corpus and not known_non_generic:
            rescored = []
        elif len(out_of_corpus) >= 2:
            if not distinctive:
                rescored = []
            elif len(distinctive) >= 2:
                minimum_distinctive = max(2, math.ceil(len(distinctive) / 2))
                gated = []
                for item in rescored:
                    candidate_terms = set(tokens(" ".join([
                        item.chunk.text,
                        item.chunk.section,
                        item.chunk.title,
                        item.chunk.doc_id,
                    ])))
                    if len(distinctive & candidate_terms) >= minimum_distinctive:
                        gated.append(item)
                rescored = gated

        for i, item in enumerate(rescored[:top_k], 1): item.rank = i
        return rescored[:top_k]

    def search_parallel(self, queries: list[str], top_k: int = 5) -> list[list[Evidence]]:
        with ThreadPoolExecutor(max_workers=max(1, min(8, len(queries)))) as pool:
            return list(pool.map(lambda q: self.search(q, top_k), queries))

class DenseRetriever:
    """Deterministic hashed dense vectors for offline development.

    This provides dense-search behavior without downloading a model. It can be
    replaced later by a sentence-transformers adapter with the same `search`
    method, while the fusion and grounding layers remain unchanged.
    """
    def __init__(self, chunks: list[Chunk], dimensions: int = 256):
        self.chunks, self.dimensions = chunks, dimensions
        self.vectors = [self.embed(c.text + " " + c.section) for c in chunks]

    def embed(self, text: str):
        vector = [0.0] * self.dimensions
        for term in tokens(text):
            # Python's built-in hash is randomized per process, which makes
            # rankings change between runs. SHA-256 keeps offline retrieval
            # reproducible across machines and server restarts.
            digest = hashlib.sha256(term.encode("utf-8")).digest()
            index = int.from_bytes(digest[:8], "big") % self.dimensions
            vector[index] += 1.0
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    def search(self, query: str, top_k: int = 10) -> list[Evidence]:
        qv = self.embed(query)
        scored = []
        for chunk, vector in zip(self.chunks, self.vectors):
            score = sum(a * b for a, b in zip(qv, vector))
            if score > 0: scored.append(Evidence(chunk, score))
        scored.sort(key=lambda x: (-x.score, x.chunk.chunk_id))
        for i, item in enumerate(scored[:top_k], 1): item.rank = i
        return scored[:top_k]

class SemanticReranker:
    """Optional CrossEncoder reranker over a small fused candidate set.

    Install `requirements.txt` and set `RERANKER_MODEL` plus
    `RERANKER_ENABLED=1` to enable it. The
    fallback preserves deterministic behavior when model weights are absent.
    """
    def __init__(self):
        self.model = None
        if os.getenv("RERANKER_ENABLED", "0").lower() not in {"1", "true", "yes"}:
            return
        try:
            from sentence_transformers import CrossEncoder
            model_name = os.getenv("RERANKER_MODEL")
            if not model_name:
                return
            # Keep local development and evaluation deterministic/offline by
            # default. Set RERANKER_LOCAL_ONLY=0 when downloading is desired.
            local_only = os.getenv("RERANKER_LOCAL_ONLY", "1").lower() in {"1", "true", "yes"}
            if local_only:
                os.environ.setdefault("HF_HUB_OFFLINE", "1")
            model_args = {"local_files_only": True} if local_only else {}
            self.model = CrossEncoder(model_name, automodel_args=model_args, tokenizer_args=model_args)
        except Exception:
            self.model = None

    def rerank(self, query: str, candidates: list[Evidence], top_k: int) -> list[Evidence]:
        if not self.model or not candidates: return candidates[:top_k]
        pairs = [(query, item.chunk.text) for item in candidates]
        scores = self.model.predict(pairs, show_progress_bar=False)
        ranked = []
        for item, score in zip(candidates, scores):
            item.score = float(score)
            ranked.append(item)
        ranked.sort(key=lambda x: (-x.score, x.chunk.chunk_id))
        return ranked[:top_k]
