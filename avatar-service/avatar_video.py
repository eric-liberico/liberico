"""AvatarVideoPublisher — publica la pista de vídeo del avatar directamente vía livekit.rtc.

El transporte LiveKit de Pipecat 0.0.108 implementa salida de AUDIO pero NO de vídeo
(`write_video_frame` no está override → no publica vídeo). Así que publicamos nosotros una
`rtc.VideoSource` + `LocalVideoTrack` y capturamos los frames de SoulX, paceados a `fps`.

Beneficio extra: el pacing a fps **sincroniza A/V** — el audio del TTS se reproduce en tiempo real
y el vídeo se drena a 25 fps (misma duración), en vez del burst 5× de SoulX. Entre turnos repite el
último frame (o el retrato) para que el profesor siga visible y la pista no se quede en negro.
"""
from __future__ import annotations

import asyncio
import time
from typing import Callable, Optional

import numpy as np
from livekit import rtc
from loguru import logger


class AvatarVideoPublisher:
    def __init__(
        self,
        get_room: Callable[[], rtc.Room],
        width: int,
        height: int,
        fps: int,
        idle_frame: Optional[np.ndarray] = None,
    ) -> None:
        self._get_room = get_room
        self.w, self.h, self.fps = width, height, fps
        self._source: Optional[rtc.VideoSource] = None
        self._queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._last = idle_frame

    async def start(self) -> None:
        if self._source is not None:
            return
        room = self._get_room()
        self._source = rtc.VideoSource(self.w, self.h)
        track = rtc.LocalVideoTrack.create_video_track("avatar", self._source)
        await room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA)
        )
        self._task = asyncio.create_task(self._run())
        logger.info("[avatar-video] pista de vídeo publicada (512x512 @ %d fps)", self.fps)

    def push(self, frame: np.ndarray) -> None:
        """Encola un frame RGB (H, W, 3) uint8 generado por SoulX."""
        if self._source is not None:
            self._queue.put_nowait(frame)

    def _capture(self, frame: np.ndarray) -> None:
        buf = np.ascontiguousarray(frame, dtype=np.uint8).tobytes()
        self._source.capture_frame(rtc.VideoFrame(self.w, self.h, rtc.VideoBufferType.RGB24, buf))
        self._last = frame

    async def _run(self) -> None:
        # Pacing preciso por reloj: exactamente un frame por intervalo (25 fps), sin acumular deriva.
        interval = 1.0 / self.fps
        next_t = time.monotonic()
        while True:
            next_t += interval
            try:
                self._capture(self._queue.get_nowait())
            except asyncio.QueueEmpty:
                if self._last is not None:  # cola vacía → mantener la cara (último frame)
                    self._capture(self._last)
            delay = next_t - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            else:
                next_t = time.monotonic()  # nos quedamos atrás → resincronizar
