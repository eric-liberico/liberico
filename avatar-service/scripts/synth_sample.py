"""synth_sample.py — genera una muestra de audio de la voz del avatar (Kokoro `ef_dora`) en el MISMO
entorno de producción (imagen :0.5 en Modal, Kokoro español ya validado), para escuchar cómo suena
sin instalar Kokoro/espeak en local. Corre en CPU (una frase = barato), no toca el app desplegado.

Uso:
    uvx --no-build --python 3.12 modal run avatar-service/scripts/synth_sample.py
    # → escribe sample_ef_dora.wav en el directorio actual

    # con texto propio:
    uvx --no-build --python 3.12 modal run avatar-service/scripts/synth_sample.py --text "Hola..."
"""
from __future__ import annotations

import io
import os
import wave
from pathlib import Path

import modal

# Misma imagen que el bot (trae kokoro + deps) + código local de avatar-service superpuesto.
AVATAR_DIR = Path(__file__).resolve().parent.parent
image = (
    modal.Image.from_registry("ghcr.io/ericpr1/liberico-avatar:0.5")
    .add_local_dir(str(AVATAR_DIR), "/opt/avatar-service")
)

volume = modal.Volume.from_name("liberico-soulx", create_if_missing=True)
VOL = "/workspace"

app = modal.App("liberico-avatar-synth-sample")

DEFAULT_TEXT = (
    "Hola, buenos días. Soy tu examinadora de español y voy a acompañarte en tu oral individual. "
    "Cuando quieras, cuéntame en qué obra has pensado y qué pasaje te gustaría comentar."
)


@app.function(image=image, volumes={VOL: volume}, timeout=300)
def synth(text: str) -> bytes:
    """Sintetiza `text` con la voz por defecto del avatar (ef_dora) y devuelve un WAV PCM16 mono."""
    import sys

    os.environ.setdefault("HF_HOME", f"{VOL}/hf_cache")  # reusa los pesos de Kokoro ya cacheados en el Volume
    sys.path.insert(0, "/opt/avatar-service")
    from kokoro_tts import KOKORO_SR, KokoroTTS, pcm16_bytes  # DEFAULT_VOICE = ef_dora

    audio = KokoroTTS().synth(text)  # float32 mono a 24 kHz, voz ef_dora

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(KOKORO_SR)
        w.writeframes(pcm16_bytes(audio))
    return buf.getvalue()


@app.local_entrypoint()
def main(text: str = DEFAULT_TEXT, out: str = "sample_ef_dora.wav") -> None:
    wav = synth.remote(text)
    Path(out).write_bytes(wav)
    print(f"OK: escrito {out} ({len(wav)} bytes) — voz Kokoro ef_dora")
