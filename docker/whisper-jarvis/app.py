"""Minimal ASR HTTP service compatible with server.js whisper-proxy (multipart audio_file, ?output=json&language=fa)."""

from __future__ import annotations

import os
import tempfile
import threading
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, File, Query, UploadFile

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

_model = None
_model_lock = threading.Lock()
_load_error: str | None = None


def _ensure_model():
    """Load model on first use (avoid crash at startup if Hugging Face / SSL fails)."""
    global _model, _load_error
    if _model is not None:
        return
    with _model_lock:
        if _model is not None:
            return
        try:
            from faster_whisper import WhisperModel

            _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
            _load_error = None
        except Exception as e:  # noqa: BLE001
            _load_error = str(e) or repr(e)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Jarvis Whisper STT", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model_loaded": _model is not None, "last_load_error": _load_error}


@app.post("/asr")
async def asr(
    audio_file: UploadFile = File(...),
    output: Literal["txt", "json", "vtt", "srt", "tsv"] = Query(default="json"),
    language: str | None = Query(default=None),
    task: str = Query(default="transcribe"),
) -> dict | str:
    try:
        _ensure_model()
    except Exception as e:  # noqa: BLE001
        msg = str(e) or repr(e)
        if output == "json":
            return {"text": "", "error": msg}
        return ""

    suffix = ".webm"
    if audio_file.filename:
        lower = audio_file.filename.lower()
        for ext in (".webm", ".wav", ".mp3", ".mp4", ".ogg", ".m4a"):
            if lower.endswith(ext):
                suffix = ext
                break

    raw = await audio_file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw)
        path = tmp.name

    text = ""
    try:
        segments, _info = _model.transcribe(
            path,
            language=language if language else None,
            task=task if task in ("transcribe", "translate") else "transcribe",
            vad_filter=False,
        )
        text = "".join(s.text for s in segments).strip()
    except Exception as exc:  # noqa: BLE001
        if output == "json":
            return {"text": "", "error": str(exc) or repr(exc)}
        return ""
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    if output == "json":
        return {"text": text}
    return text
