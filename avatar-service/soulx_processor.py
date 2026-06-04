"""SoulXVideoProcessor — FrameProcessor de Pipecat que convierte el audio del TTS en vídeo del avatar.

Se coloca en el pipeline DESPUÉS del TTS. Por cada `TTSAudioRawFrame` (PCM del TTS):
  1) lo deja pasar aguas abajo (para que el transporte reproduzca el audio), y
  2) lo resamplea a 16 kHz, lo empuja a `SoulXStreamer` y emite los frames de vídeo resultantes como
     `OutputImageRawFrame`. El transporte (LiveKit) los pacea a `camera_out_framerate`.

Al `TTSStoppedFrame` hace `flush()` del audio residual. Entre turnos, mientras el alumno habla, no se
genera vídeo (se puede mostrar un bucle "escuchando" pre-renderizado; ver IDLE_LOOP en bot.py).

⚠️ El ajuste fino de **lip-sync A/V** (alinear el ~1 slice de latencia entre audio y vídeo) se calibra en
el test en vivo; v1 deja pasar el audio inmediatamente y emite el vídeo según se genera.
"""
from __future__ import annotations

import asyncio

import numpy as np
from loguru import logger
from pipecat.frames.frames import (
    Frame,
    OutputImageRawFrame,
    TTSAudioRawFrame,
    TTSStoppedFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from kokoro_tts import resample
from soulx_stream import SoulXStreamer


class SoulXVideoProcessor(FrameProcessor):
    def __init__(self, streamer: SoulXStreamer) -> None:
        super().__init__()
        self._streamer = streamer
        self._fps = streamer.tgt_fps
        self._emitted = 0

    async def _emit_frames(self, frames) -> None:
        n = 0
        for f in frames:
            h, w = f.shape[0], f.shape[1]
            await self.push_frame(
                OutputImageRawFrame(image=np.ascontiguousarray(f).tobytes(), size=(w, h), format="RGB"),
                FrameDirection.DOWNSTREAM,
            )
            n += 1
        if n:
            self._emitted += n
            logger.info(f"[soulx] emitidos {n} frames de vídeo (total {self._emitted})")

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSAudioRawFrame):
            # 1) audio aguas abajo (se reproduce en el transporte)
            await self.push_frame(frame, direction)
            # 2) audio → 16k → SoulX (en un HILO: la inferencia PyTorch es bloqueante y, en el loop,
            #    congelaría la entrada de audio del alumno → ni VAD ni STT mientras el avatar habla).
            pcm = np.frombuffer(frame.audio, dtype="<i2").astype(np.float32) / 32768.0
            audio16k = resample(pcm, frame.sample_rate, self._streamer.sample_rate)
            frames = await asyncio.to_thread(lambda: list(self._streamer.push_audio(audio16k)))
            await self._emit_frames(frames)
            return

        if isinstance(frame, TTSStoppedFrame):
            frames = await asyncio.to_thread(lambda: list(self._streamer.flush()))
            await self._emit_frames(frames)
            await self.push_frame(frame, direction)
            return

        await self.push_frame(frame, direction)
