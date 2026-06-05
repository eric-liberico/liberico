"""AvatarVideoPublisher — publica la pista de vídeo del avatar vía livekit.rtc.

El transporte LiveKit de Pipecat 0.0.108 implementa salida de AUDIO pero NO de vídeo
(`write_video_frame` no está override) → publicamos nosotros una `rtc.VideoSource` + `LocalVideoTrack`.

El pacing/lockstep A/V lo hace el SoulXVideoProcessor (emite cada frame de vídeo junto con sus 40 ms
de audio en el mismo tick de 25 fps → WebRTC los sincroniza por timestamp). Aquí solo capturamos el
frame que nos manden (`send`), repitiendo el último si llega None (mantener la cara visible).
"""
from __future__ import annotations

from typing import Callable, Optional

import cv2
import numpy as np
from livekit import rtc
from loguru import logger


class AvatarVideoPublisher:
    def __init__(
        self,
        get_room: Callable[[], rtc.Room],
        width: int,
        height: int,
        idle_frame: Optional[np.ndarray] = None,
    ) -> None:
        self._get_room = get_room
        self.w, self.h = width, height
        self._source: Optional[rtc.VideoSource] = None
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
        logger.info("[avatar-video] pista de vídeo publicada ({}x{})", self.w, self.h)

    def send(self, frame: Optional[np.ndarray]) -> None:
        """Captura un frame RGB (H, W, 3) uint8 ahora mismo. None → repite el último (idle).

        SoulX genera 512²; si la pista es mayor (p. ej. 1024²) hacemos un upscale cúbico cosmético
        (más grande/limpio en pantallas grandes; no añade detalle real — la SR en vivo no cabe en 1 GPU).
        """
        if self._source is None:
            return
        f = frame if frame is not None else self._last
        if f is None:
            return
        if f.shape[0] != self.h or f.shape[1] != self.w:
            f = cv2.resize(f, (self.w, self.h), interpolation=cv2.INTER_CUBIC)
        buf = np.ascontiguousarray(f, dtype=np.uint8).tobytes()
        self._source.capture_frame(rtc.VideoFrame(self.w, self.h, rtc.VideoBufferType.RGB24, buf))
        self._last = f
