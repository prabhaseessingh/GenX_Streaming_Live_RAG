import json
from pathlib import Path
from app.corpus import load_corpus
from app.models import Chunk
from app.retrieval import FusedRetriever

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "data" / "processed" if (ROOT / "data" / "processed" / "corpus.json").exists() else ROOT / "data" / "documents"

QUESTIONS = [
    {"query": "How are foreign currency expenses reimbursed?", "expected": {"DOC_06_NORTHWESTERN_TRAVEL", "DOC_03_ACADIA_TRAVEL"}},
    {"query": "What happens when receipts are missing?", "expected": {"DOC_05_WUSTL_TRAVEL", "DOC_07_SWEETBRIAR_TRAVEL", "DOC_11_WPI_TRAVEL"}},
    {"query": "What are the rules for rental car insurance?", "expected": {"DOC_03_ACADIA_TRAVEL", "DOC_06_NORTHWESTERN_TRAVEL"}},
    {"query": "How is mileage reimbursement calculated?", "expected": {"DOC_10_GSA_FTR_OVERVIEW", "DOC_04_UOREGON_TRAVEL"}},
    {"query": "What are the rules for travel advances?", "expected": {"DOC_07_SWEETBRIAR_TRAVEL", "DOC_02_RUTGERS_SOP11"}},
    {"query": "What policy covers contractor liability and indemnification?", "expected": {"DOC_12_UCOP_BUS63"}},
]

def run():
    chunks = load_corpus(CORPUS)
    retriever = FusedRetriever(chunks)
    rows = []
    for item in QUESTIONS:
        hits = retriever.search(item["query"], 5)
        returned = {x.chunk.doc_id for x in hits}
        ranks = [i + 1 for i, x in enumerate(hits) if x.chunk.doc_id in item["expected"]]
        rows.append({"query": item["query"], "hit": bool(ranks), "precision_at_5": len(returned & item["expected"]) / max(1, len(returned)), "recall_at_5": len(returned & item["expected"]) / len(item["expected"]), "reciprocal_rank": 1 / ranks[0] if ranks else 0, "expected": sorted(item["expected"]), "returned": sorted(returned)})
    hit_rate = sum(r["hit"] for r in rows) / len(rows)
    report = {"hit_rate_at_5": hit_rate, "mean_precision_at_5": sum(r["precision_at_5"] for r in rows) / len(rows), "mean_recall_at_5": sum(r["recall_at_5"] for r in rows) / len(rows), "mrr_at_5": sum(r["reciprocal_rank"] for r in rows) / len(rows), "questions": rows}
    print(json.dumps(report, indent=2))
    return 0 if hit_rate >= .80 else 1

if __name__ == "__main__": raise SystemExit(run())
