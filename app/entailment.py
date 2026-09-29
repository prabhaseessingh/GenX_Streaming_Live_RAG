import math
import os


class EntailmentChecker:
    """Optional NLI checker with a deterministic lexical fallback."""
    def __init__(self):
        self.model = None
        model_name = os.getenv("ENTAILMENT_MODEL", "")
        if model_name and os.getenv("ENTAILMENT_ENABLED", "0").lower() in {"1", "true", "yes"}:
            try:
                from sentence_transformers import CrossEncoder
                local_only = os.getenv("ENTAILMENT_LOCAL_ONLY", "1").lower() in {"1", "true", "yes"}
                if local_only:
                    os.environ.setdefault("HF_HUB_OFFLINE", "1")
                model_args = {"local_files_only": True} if local_only else {}
                self.model = CrossEncoder(model_name, automodel_args=model_args, tokenizer_args=model_args)
            except Exception:
                self.model = None

    def score(self, evidence: str, claim: str):
        if not self.model:
            return None
        values = self.model.predict([(evidence, claim)], show_progress_bar=False)
        value = values[0]
        if hasattr(value, "__len__") and not isinstance(value, (str, bytes)):
            logits = [float(x) for x in value]
            exp = [math.exp(x - max(logits)) for x in logits]
            probs = [x / sum(exp) for x in exp]
            return probs[2] if len(probs) >= 3 else max(probs)
        return float(value)
