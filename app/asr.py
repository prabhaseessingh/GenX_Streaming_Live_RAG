"""Optional local ASR adapter.

ASR is deliberately separate from the RAG engine. Any provider can implement
transcribe() and emit timestamped text chunks to SessionManager.ingest().
"""
import os


class ASRUnavailable(RuntimeError):
    pass


class FasterWhisperASR:
    def __init__(self, model_size: str | None = None, device: str | None = None):
        self.model_size = model_size or os.getenv("ASR_MODEL", "small")
        self.device = device or os.getenv("ASR_DEVICE", "cpu")
        try:
            from faster_whisper import WhisperModel
            compute_type = os.getenv("ASR_COMPUTE_TYPE", "int8")
            self.model = WhisperModel(self.model_size, device=self.device, compute_type=compute_type)
        except Exception as exc:
            raise ASRUnavailable("Install requirements.txt to enable local Whisper ASR") from exc

    def transcribe(self, audio_path: str):
        segments, info = self.model.transcribe(audio_path, vad_filter=True)
        return [{"timestamp_s": float(segment.start), "text": segment.text.strip()} for segment in segments if segment.text.strip()], info
