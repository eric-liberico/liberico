"""transcribe_audio.py — Transcribe un audio local con faster-whisper large-v3 en la GPU de Modal.

Reutiliza el modelo large-v3 ya cacheado en el Volume `liberico-soulx` (mismo que usa el oral en vivo), así
que la transcripción es un proxy fiel de lo que vería el Criterio A. Verbatim (condition_on_previous_text=False
→ no "normaliza" hacia español fluido; conserva los errores reales del alumno).

Uso (un fichero):
    modal run avatar-service/transcribe_audio.py --path ~/Desktop/oral/parte1.m4a

Uso (carpeta con parte1/2/3): correr tres veces, una por fichero.
Formatos: cualquiera que lea ffmpeg (m4a, mp3, wav, ogg…). El modelo está cacheado → arranque corto.
"""
from __future__ import annotations

import modal

image = modal.Image.from_registry("ghcr.io/ericpr1/liberico-avatar:0.5")
volume = modal.Volume.from_name("liberico-soulx", create_if_missing=True)
VOL = "/workspace"

app = modal.App("liberico-transcribe")


@app.function(image=image, gpu="A100", volumes={VOL: volume}, timeout=60 * 12)
def transcribe(audio: bytes, language: str = "es") -> str:
    import os
    import tempfile

    os.environ.setdefault("HF_HOME", f"{VOL}/hf_cache")  # large-v3 cacheado en el Volume
    from faster_whisper import WhisperModel  # type: ignore

    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as fp:
        fp.write(audio)
        path = fp.name

    # Verbatim: temperatura 0 y sin condicionar al texto previo → fiel a lo dicho (errores L2 incluidos).
    segments, _info = model.transcribe(
        path, language=language, temperature=0.0, condition_on_previous_text=False, vad_filter=True,
    )
    return " ".join(s.text.strip() for s in segments).strip()


@app.local_entrypoint()
def main(path: str, language: str = "es") -> None:
    with open(path, "rb") as f:
        data = f.read()
    print("\n========== TRANSCRIPCIÓN (large-v3, verbatim) ==========\n")
    print(transcribe.remote(data, language))
    print("\n=======================================================\n")
