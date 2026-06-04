"""KokoroTTSService — servicio de Pipecat para TTS español con Kokoro `em_santa`.

Pipecat 0.0.108 trae un `pipecat.services.kokoro` pero usa **kokoro-onnx** (otro backend y otro
juego de voces). Aquí subclaseamos `TTSService` envolviendo nuestro `kokoro_tts.KokoroTTS` (paquete
`kokoro`/KPipeline), que ya validamos con la voz **em_santa** en M5. Así mantenemos exactamente la
voz elegida y no dependemos de los modelos ONNX.

Contrato de Pipecat (verificado en 0.0.108):
    TTSService.run_tts(self, text: str, context_id: str) -> AsyncGenerator[Frame, None]
    → emite TTSStartedFrame, uno o varios TTSAudioRawFrame (PCM int16) y TTSStoppedFrame.
"""
from __future__ import annotations

import asyncio
import re
from typing import AsyncGenerator

import numpy as np
from loguru import logger
from pipecat.frames.frames import Frame, TTSAudioRawFrame, TTSStartedFrame, TTSStoppedFrame
from pipecat.services.tts_service import TTSService

from kokoro_tts import KOKORO_SR, KokoroTTS, pcm16_bytes

# Trozos de ~120 ms para empujar el audio de forma fluida aguas abajo (el SoulXVideoProcessor
# reacumula por su cuenta, así que el tamaño exacto no es crítico).
_CHUNK_MS = 120

# Caracteres de markdown/símbolos que Kokoro leería literalmente ("asterisco", "almohadilla"…).
_STRIP = re.compile(r"[*_#`~|<>\[\]{}\\]+")


def _clean_for_tts(text: str) -> str:
    """Quita markdown y símbolos no hablables; conserva la puntuación que da prosodia (¿? ¡! . , ;)."""
    text = _STRIP.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class KokoroTTSService(TTSService):
    def __init__(self, *, voice: str = "em_santa", device: str | None = None, **kwargs) -> None:
        # Kokoro produce a 24 kHz; declaramos ese sample_rate y Pipecat resamplea para el transporte.
        super().__init__(sample_rate=KOKORO_SR, **kwargs)
        self._tts = KokoroTTS(voice=voice, device=device)
        self._chunk_samples = KOKORO_SR * _CHUNK_MS // 1000
        # Nota: set_voice() es coroutine y aquí no se puede await; el aviso "TTSSettings NOT_GIVEN"
        # es cosmético (no usamos model/voice/language runtime; run_tts está sobrescrito).

    def can_generate_metrics(self) -> bool:
        return True

    async def run_tts(self, text: str, context_id: str) -> AsyncGenerator[Frame, None]:
        text = _clean_for_tts(text)
        logger.info(f"[kokoro] run_tts: {text!r}")
        await self.start_ttfb_metrics()
        yield TTSStartedFrame()
        if not text:
            yield TTSStoppedFrame()
            return

        # La síntesis de Kokoro es bloqueante (PyTorch) → a un hilo para no parar el event loop.
        audio = await asyncio.to_thread(self._tts.synth, text)  # float32 24 kHz
        await self.stop_ttfb_metrics()
        logger.info(f"[kokoro] sintetizadas {audio.size/KOKORO_SR:.1f}s de audio")

        for i in range(0, audio.size, self._chunk_samples):
            chunk = audio[i : i + self._chunk_samples]
            if chunk.size == 0:
                continue
            yield TTSAudioRawFrame(
                audio=pcm16_bytes(np.asarray(chunk, dtype=np.float32)),
                sample_rate=KOKORO_SR,
                num_channels=1,
            )

        yield TTSStoppedFrame()
