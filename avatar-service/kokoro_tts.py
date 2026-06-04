"""TTS español con Kokoro-82M (Apache-2.0) — helper autocontenido y validado.

Pieza propia y *desacoplada de Pipecat*: sintetiza texto → PCM, para que `bot.py`
(`KokoroTTSService`) lo envuelva como servicio de Pipecat sin depender de una versión
concreta de `pipecat-ai`. Esto se puede probar solo, en CPU o GPU:

    python kokoro_tts.py "Buenos días, vamos a empezar tu oral de español." salida.wav

Kokoro (validado en el spike, ver docs/avatar-soulx-spike.md §V2):
  - `KPipeline(lang_code='e')`  → español
  - voz `em_santa`              → la elegida para el profesor
  - salida a **24 kHz** mono float32

Para el pipeline del avatar interesa el audio a **16 kHz** (lo que consume el encoder
wav2vec2 de SoulX); `synth_16k()` lo devuelve ya resampleado.
"""
from __future__ import annotations

from typing import Iterator

import numpy as np

KOKORO_SR = 24000          # frecuencia nativa de Kokoro
WAV2VEC_SR = 16000         # la que espera SoulX-FlashHead
DEFAULT_VOICE = "em_santa"  # voz del profesor (validada en V2)


class KokoroTTS:
    """Envuelve `kokoro.KPipeline` para español. Carga el modelo una sola vez."""

    def __init__(self, voice: str = DEFAULT_VOICE, device: str | None = None) -> None:
        from kokoro import KPipeline  # import perezoso: no se necesita en quien solo importe tipos

        # lang_code='e' = español; device None deja que Kokoro elija (cuda si hay).
        self._pipeline = KPipeline(lang_code="e", device=device)
        self.voice = voice

    def synth(self, text: str, voice: str | None = None) -> np.ndarray:
        """Sintetiza `text` → audio float32 mono a 24 kHz (concatena los segmentos)."""
        chunks = list(self.synth_chunks(text, voice=voice))
        if not chunks:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate(chunks).astype(np.float32)

    def synth_chunks(self, text: str, voice: str | None = None) -> Iterator[np.ndarray]:
        """Itera los segmentos de audio (24 kHz) según los genera Kokoro.

        Útil para *streaming*: cada segmento puede empujarse al avatar/transporte sin
        esperar a la frase completa, reduciendo el time-to-first-frame.
        """
        gen = self._pipeline(text, voice=voice or self.voice)
        for _, _, audio in gen:
            yield _to_float32(audio)

    def synth_16k(self, text: str, voice: str | None = None) -> np.ndarray:
        """Como `synth` pero resampleado a 16 kHz (lo que consume el encoder de SoulX)."""
        return resample(self.synth(text, voice=voice), KOKORO_SR, WAV2VEC_SR)


def _to_float32(audio: object) -> np.ndarray:
    """Normaliza la salida de Kokoro (torch.Tensor o np.ndarray) a np.float32 1-D."""
    arr = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
    return np.asarray(arr, dtype=np.float32).reshape(-1)


def resample(audio: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    """Resampleo lineal sencillo (sin dependencias extra). Suficiente para 24k→16k de voz."""
    if sr_in == sr_out or audio.size == 0:
        return audio.astype(np.float32)
    n_out = int(round(audio.size * sr_out / sr_in))
    x_old = np.linspace(0.0, 1.0, num=audio.size, endpoint=False)
    x_new = np.linspace(0.0, 1.0, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(np.float32)


def pcm16_bytes(audio_f32: np.ndarray) -> bytes:
    """float32 [-1,1] → PCM int16 little-endian (formato típico para SFU/WebRTC)."""
    clipped = np.clip(audio_f32, -1.0, 1.0)
    return (clipped * 32767.0).astype("<i2").tobytes()


if __name__ == "__main__":
    import sys

    text = sys.argv[1] if len(sys.argv) > 1 else "Hola, soy tu profesor de español. ¿Empezamos?"
    out = sys.argv[2] if len(sys.argv) > 2 else "kokoro_test.wav"

    tts = KokoroTTS()
    audio = tts.synth(text)
    try:
        import soundfile as sf

        sf.write(out, audio, KOKORO_SR)
        print(f"OK: {audio.size / KOKORO_SR:.2f}s @ {KOKORO_SR} Hz → {out}")
    except Exception as exc:  # noqa: BLE001 — solo para la prueba manual
        print(f"audio generado ({audio.size} muestras) pero no se pudo escribir wav: {exc}")
