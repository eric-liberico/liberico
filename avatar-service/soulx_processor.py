"""SoulXVideoProcessor — genera el avatar y emite A/V en LOCKSTEP (sincronizados).

Clave del lip-sync: WebRTC sincroniza audio y vídeo por timestamp SOLO si se emiten acoplados en el
origen. Por eso un único pacer a 25 fps emite, en cada tick, UN frame de vídeo JUNTO con sus 40 ms de
audio. Así no hay desfase (audio adelantado) ni huecos (cortes).

Dos tareas:
  · `_generate` (rápida, en hilo): alimenta SoulX SIEMPRE — audio del TTS → lip-sync; silencio → idle
    vivo (parpadeos). Empareja cada frame con sus 40 ms de audio (o None en silencio) y lo encola.
    Se autolimita para mantener solo ~1 s por delante (latencia acotada).
  · `_pace` (25 fps exactos): saca un (frame, audio40), captura el vídeo y empuja el audio a la vez.

SoulX corre en hilo (`asyncio.to_thread`): su inferencia bloquearía el VAD/STT del alumno en el loop.
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

PLAY_SR = 24000          # frecuencia de reproducción (nativa de Kokoro)
_BUFFER_FRAMES = 24      # frames generados por delante (~1 s de margen a 25 fps)


class SoulXVideoProcessor(FrameProcessor):
    def __init__(self, streamer: SoulXStreamer, publisher: AvatarVideoPublisher) -> None:
        super().__init__()
        self._streamer = streamer
        self._publisher = publisher
        self._soulx_buf = np.zeros(0, dtype=np.float32)  # audio 16k para SoulX
        self._play_buf = np.zeros(0, dtype=np.float32)   # audio 24k para reproducir (alineado)
        self._lock = threading.Lock()
        self._out: asyncio.Queue = asyncio.Queue()       # (frame_rgb, audio40_bytes | None)
        self._spf = PLAY_SR // streamer.tgt_fps          # muestras de audio (24k) por frame de vídeo
        self._gen_task: asyncio.Task | None = None
        self._pace_task: asyncio.Task | None = None
        self._spoke = False

    def start_driver(self) -> None:
        if self._gen_task is None:
            self._gen_task = asyncio.create_task(self._generate())
            self._pace_task = asyncio.create_task(self._pace())

    def _take(self):
        n16 = self._streamer.slice_samples
        with self._lock:
            avail = len(self._soulx_buf)
            if avail == 0:
                return np.zeros(n16, dtype=np.float32), None  # silencio → idle vivo, sin audio
            take16 = min(avail, n16)  # incluye el slice PARCIAL final (no cortar palabras)
            c16 = self._soulx_buf[:take16]
            self._soulx_buf = self._soulx_buf[take16:]
            n24 = self._streamer.slice_frames * self._spf
            c24 = self._play_buf[:n24]
            self._play_buf = self._play_buf[n24:]
            if take16 < n16:
                c16 = np.pad(c16, (0, n16 - take16))
            return c16, c24

    async def _generate(self) -> None:
        logger.info("[soulx] generador iniciado (idle vivo + lip-sync, A/V emparejado)")
        while True:
            if self._out.qsize() >= _BUFFER_FRAMES:  # ya hay ~1 s por delante → esperar
                await asyncio.sleep(0.01)
                continue
            c16, c24 = self._take()
            frames = await asyncio.to_thread(lambda c=c16: list(self._streamer.push_audio(c)))
            if c24 is not None:
                need = len(frames) * self._spf
                if c24.size < need:
                    c24 = np.pad(c24, (0, need - c24.size))
            for i, f in enumerate(frames):
                audio40 = None
                if c24 is not None:
                    a = c24[i * self._spf : (i + 1) * self._spf]
                    audio40 = (np.clip(a, -1.0, 1.0) * 32767).astype("<i2").tobytes()
                self._out.put_nowait((f, audio40))

    async def _pace(self) -> None:
        interval = 1.0 / self._streamer.tgt_fps
        next_t = time.monotonic()
        while True:
            next_t += interval
            try:
                frame, audio40 = self._out.get_nowait()
            except asyncio.QueueEmpty:
                frame, audio40 = None, None  # generador por detrás → repetir cara, sin audio
            self._publisher.send(frame)
            if audio40 is not None:
                await self.push_frame(
                    OutputAudioRawFrame(audio=audio40, sample_rate=PLAY_SR, num_channels=1),
                    FrameDirection.DOWNSTREAM,
                )
            delay = next_t - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            else:
                next_t = time.monotonic()  # nos quedamos atrás → resincronizar

    def _drain_out(self) -> None:
        try:
            while True:
                self._out.get_nowait()
        except asyncio.QueueEmpty:
            pass

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSAudioRawFrame):
            # NO reenviar el audio aquí: lo emite el pacer, frame a frame, junto con el vídeo.
            pcm = np.frombuffer(frame.audio, dtype="<i2").astype(np.float32) / 32768.0
            with self._lock:
                self._soulx_buf = np.concatenate([self._soulx_buf, resample(pcm, frame.sample_rate, self._streamer.sample_rate)])
                self._play_buf = np.concatenate([self._play_buf, resample(pcm, frame.sample_rate, PLAY_SR)])
            if not self._spoke:
                self._spoke = True
                logger.info("[soulx] recibiendo audio TTS → lip-sync")
            return

        if isinstance(frame, StartInterruptionFrame):
            with self._lock:  # el alumno interrumpe → descartar lo pendiente
                self._soulx_buf = np.zeros(0, dtype=np.float32)
                self._play_buf = np.zeros(0, dtype=np.float32)
            self._drain_out()
            await self.push_frame(frame, direction)
            return

        await self.push_frame(frame, direction)
