"""SoulXVideoProcessor + driver continuo con emisión A/V EMPAREJADA (audio sincronizado con el vídeo).

Por qué: si el audio del TTS se reproduce de golpe y el vídeo llega con la latencia de SoulX, el audio
va adelantado. Aquí el audio NO se reenvía al llegar: se guarda y lo emite el driver, slice a slice,
JUNTO con los frames de vídeo de ese mismo slice → audio y labios van a la vez.

El driver alimenta SoulX SIEMPRE (en tiempo real):
  · audio del TTS pendiente → lip-sync (+ se reproduce ese trozo de audio),
  · si no hay → silencio → SoulX genera parpadeos/micro-movimientos (idle vivo, no una foto).
SoulX corre en un hilo (inferencia bloqueante; en el loop congelaría el VAD/STT del alumno).
"""
from __future__ import annotations

import asyncio
import threading
import time

import numpy as np
from loguru import logger
from pipecat.frames.frames import (
    Frame,
    OutputAudioRawFrame,
    StartInterruptionFrame,
    TTSAudioRawFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from avatar_video import AvatarVideoPublisher
from kokoro_tts import resample
from soulx_stream import SoulXStreamer

PLAY_SR = 24000  # frecuencia de reproducción (nativa de Kokoro)


class SoulXVideoProcessor(FrameProcessor):
    def __init__(self, streamer: SoulXStreamer, publisher: AvatarVideoPublisher) -> None:
        super().__init__()
        self._streamer = streamer
        self._publisher = publisher
        self._soulx_buf = np.zeros(0, dtype=np.float32)  # audio 16k para SoulX
        self._play_buf = np.zeros(0, dtype=np.float32)   # audio 24k para reproducir (alineado con el anterior)
        self._lock = threading.Lock()
        self._driver_task: asyncio.Task | None = None
        self._spoke = False

    def start_driver(self) -> None:
        if self._driver_task is None:
            self._driver_task = asyncio.create_task(self._drive())

    def _take(self):
        n16 = self._streamer.slice_samples
        with self._lock:
            avail = len(self._soulx_buf)
            if avail == 0:
                return np.zeros(n16, dtype=np.float32), None  # silencio → idle vivo, sin audio
            take16 = min(avail, n16)  # incluye el último slice PARCIAL (no descartar palabras)
            c16 = self._soulx_buf[:take16]
            self._soulx_buf = self._soulx_buf[take16:]
            n24 = round(take16 * PLAY_SR / self._streamer.sample_rate)
            c24 = self._play_buf[:n24]
            self._play_buf = self._play_buf[n24:]
            if take16 < n16:  # rellenar la entrada de SoulX a un slice completo (con silencio)
                c16 = np.pad(c16, (0, n16 - take16))
            return c16, c24

    async def _drive(self) -> None:
        slice_dur = self._streamer.slice_frames / self._streamer.tgt_fps  # ~0.96 s
        logger.info("[soulx] driver continuo iniciado (idle vivo + lip-sync A/V emparejado)")
        while True:
            t0 = time.monotonic()
            c16, c24 = self._take()
            frames = await asyncio.to_thread(lambda c=c16: list(self._streamer.push_audio(c)))
            for f in frames:
                self._publisher.push(f)
            if c24 is not None and c24.size:
                pcm = (np.clip(c24, -1.0, 1.0) * 32767).astype("<i2").tobytes()
                await self.push_frame(
                    OutputAudioRawFrame(audio=pcm, sample_rate=PLAY_SR, num_channels=1),
                    FrameDirection.DOWNSTREAM,
                )
            await asyncio.sleep(max(0.0, slice_dur - (time.monotonic() - t0)))

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSAudioRawFrame):
            # NO reenviar el audio aquí: lo emite el driver, sincronizado con el vídeo.
            pcm = np.frombuffer(frame.audio, dtype="<i2").astype(np.float32) / 32768.0
            with self._lock:
                self._soulx_buf = np.concatenate([self._soulx_buf, resample(pcm, frame.sample_rate, self._streamer.sample_rate)])
                self._play_buf = np.concatenate([self._play_buf, resample(pcm, frame.sample_rate, PLAY_SR)])
            if not self._spoke:
                self._spoke = True
                logger.info("[soulx] recibiendo audio TTS → lip-sync emparejado")
            return

        if isinstance(frame, StartInterruptionFrame):
            # el alumno interrumpe → descartar lo que quedaba por decir
            with self._lock:
                self._soulx_buf = np.zeros(0, dtype=np.float32)
                self._play_buf = np.zeros(0, dtype=np.float32)
            await self.push_frame(frame, direction)
            return

        await self.push_frame(frame, direction)
