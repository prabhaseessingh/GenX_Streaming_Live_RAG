import json
from pathlib import Path
from .models import Chunk

def load_corpus(directory: str | Path) -> list[Chunk]:
    chunks = []
    for path in sorted(Path(directory).glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        for item in raw.get("chunks", []):
            chunks.append(Chunk(
                chunk_id=item["chunk_id"], doc_id=item["doc_id"],
                section=item.get("section", ""), page=item.get("page"),
                text=item["text"].strip(), title=item.get("title", ""),
                category=item.get("category", ""), source_url=item.get("source_url", "")))
    if not chunks:
        raise ValueError(f"No corpus chunks found in {directory}")
    return chunks
