"""Convert source documents into the stable chunk schema used by retrieval."""
import json
import re
from pathlib import Path
from .models import Chunk

def repair_text(text: str) -> str:
    """Repair common UTF-8-as-Windows-1252 artifacts from PDF extraction."""
    # Recover text that was decoded as Latin-1 after being encoded as UTF-8.
    for _ in range(2):
        if not any(marker in text for marker in ("â", "Ã", "Â", "ð")): break
        try:
            repaired = text.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if repaired == text: break
        text = repaired
    replacements = {
        "â€™": "'", "â€˜": "'", "â€œ": '"', "â€�": '"',
        "â€“": "-", "â€”": "-", "â€¦": "...", "â€¢": "-", "â¯": " ",
        "�": "", "Â": "", "‑": "-",
    }
    for bad, good in replacements.items(): text = text.replace(bad, good)
    text = re.sub(r"(?<=\w)â(?=\w)", "-", text)
    return text

def _chunk(doc_id, section, text, page=None, index=1, title="", category="", source_url=""):
    text = repair_text(re.sub(r"\s+", " ", text)).strip()
    if not text: return None
    return Chunk(f"{doc_id}_{index:04d}", doc_id, section or "General", page, text, title, category, source_url)

def ingest_json(path: Path) -> list[Chunk]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    chunks = []
    for i, item in enumerate(raw.get("chunks", []), 1):
        chunks.append(Chunk(item.get("chunk_id", f"{path.stem}_{i:04d}"), item.get("doc_id", path.stem), item.get("section", "General"), item.get("page"), item["text"].strip()))
    return chunks

def ingest_markdown(path: Path) -> list[Chunk]:
    doc_id, section, chunks, buffer, index = path.stem, "General", [], [], 1
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^#{1,6}\s+(.+)$", line.strip())
        if heading:
            item = _chunk(doc_id, section, " ".join(buffer), index=index)
            if item: chunks.append(item); index += 1
            section, buffer = heading.group(1).strip(), []
        elif line.strip(): buffer.append(line.strip())
    item = _chunk(doc_id, section, " ".join(buffer), index=index)
    if item: chunks.append(item)
    return chunks

def ingest_pdf(path: Path, doc_id: str | None = None, category: str | None = None, title: str = "", source_url: str = "") -> list[Chunk]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("PDF ingestion requires pypdf; install requirements.txt") from exc
    chunks, index = [], 1
    for page_number, page in enumerate(PdfReader(str(path)).pages, 1):
        text = page.extract_text() or ""
        # Split extracted PDF text into paragraph-sized chunks. Preserve
        # numbered policy headings when they are available, while bounding
        # chunk size so citations remain precise.
        lines = [repair_text(re.sub(r"\s+", " ", line)).strip() for line in text.splitlines() if line.strip()]
        section = category or f"Page {page_number}"
        buffer = []
        for line in lines:
            heading = re.match(r"^(?:T\d{1,3}|[A-Z]\d{1,3}|\d+(?:\.\d+)*)\s*(?:[-–—:�]|\s{2,})", line, re.I) or re.match(r"^(?:[A-Z][A-Z\s/&-]{4,})$", line)
            if heading and buffer:
                item = _chunk(doc_id or path.stem, section, " ".join(buffer), page_number, index, title, category or section, source_url)
                if item: chunks.append(item); index += 1
                buffer = []
                section = line[:160]
            else:
                buffer.append(line)
            if len(" ".join(buffer).split()) >= 140:
                item = _chunk(doc_id or path.stem, section, " ".join(buffer), page_number, index, title, category or section, source_url)
                if item: chunks.append(item); index += 1
                buffer = []
        item = _chunk(doc_id or path.stem, section, " ".join(buffer), page_number, index, title, category or section, source_url)
        if item: chunks.append(item); index += 1
    return chunks

def ingest_file(path: str | Path, doc_id: str | None = None, category: str | None = None, title: str = "", source_url: str = "") -> list[Chunk]:
    path = Path(path)
    if path.suffix.lower() == ".json": return ingest_json(path)
    if path.suffix.lower() in {".md", ".markdown", ".txt"}: return ingest_markdown(path)
    if path.suffix.lower() == ".pdf": return ingest_pdf(path, doc_id, category, title, source_url)
    raise ValueError(f"Unsupported corpus file: {path.suffix}")

def ingest_directory(source: str | Path, output: str | Path) -> int:
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    all_chunks = []
    source = Path(source)
    manifest = {}
    manifest_path = source / "corpus_manifest.json"
    if manifest_path.exists():
        raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if isinstance(raw_manifest, list):
            manifest = {item.get("filename"): item for item in raw_manifest}
    for path in sorted(source.iterdir()):
        if path.is_file() and path.suffix.lower() in {".json", ".md", ".markdown", ".txt", ".pdf"}:
            if path.name == "corpus_manifest.json": continue
            metadata = manifest.get(path.name, {})
            all_chunks.extend(ingest_file(path, metadata.get("doc_id"), metadata.get("category"), metadata.get("title", ""), metadata.get("url", "")))
    payload = {"chunks": [c.__dict__ for c in all_chunks]}
    (output / "corpus.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return len(all_chunks)
