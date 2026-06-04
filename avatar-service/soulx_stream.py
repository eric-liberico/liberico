"""
soulx_stream.py — Wrapper de STREAMING para SoulX-FlashHead.

Envuelve la API de inferencia del repo (flash_head.inference) para usarla en un bucle conversacional en vivo:
  init(retrato) una vez  →  push_audio(chunk_16k) muchas veces  →  emite frames de vídeo según llega el audio.

API real de SoulX usada (verificada en flash_head/inference.py):
  get_pipeline(world_size, ckpt_dir, model_type, wav2vec_dir) -> FlashHeadPipeline
  get_base_data(pipeline, cond_image_path_or_dir, base_seed, use_face_crop) -> None
  get_infer_params() -> dict   # sample_rate, tgt_fps, frame_num, motion_frames_num
  get_audio_embedding(pipeline, audio_array, audio_start_idx=-1, audio_end_idx=-1) -> Tensor [1, N, 5, D]
  run_pipeline(pipeline, audio_embedding) -> Tensor [N, H, W, 3]  (0..255)

⚠️ ESTADO: borrador fundamentado en las firmas reales pero **PENDIENTE DE PROBAR EN GPU**. Los puntos marcados
TODO(confirmar) hay que validarlos contra `generate_video.py` del repo (lógica exacta de ventana de audio).
"""

from __future__ import annotations

import threading
from collections import deque
from typing import Iterator

import numpy as np

# Imports del repo SoulX (en la imagen Docker el repo está en /opt/SoulX-FlashHead, que debe estar en PYTHONPATH)
from flash_head.inference import (  # type: ignore
    get_pipeline,
    get_base_data,
    get_infer_params,
    get_audio_embedding,
    run_pipeline,
)


class SoulXStreamer:
    """Generador de talking-head en streaming a partir de chunks de audio (16 kHz, mono, float32 -1..1)."""

    def __init__(
        self,
        ckpt_dir: str,
        wav2vec_dir: str,
        cond_image: str,
        model_type: str = "lite",
        base_seed: int = 42,
        use_face_crop: bool = True,
    ) -> None:
        # 1) Pipeline (carga pesos en VRAM). Hacer en el WARM-UP (oculto por la preparación del alumno).
        self.pipeline = get_pipeline(
            world_size=1, ckpt_dir=ckpt_dir, model_type=model_type, wav2vec_dir=wav2vec_dir
        )
        # 2) Retrato del profesor (se hace una vez por sesión).
        get_base_data(
            self.pipeline,
            cond_image_path_or_dir=cond_image,
            base_seed=base_seed,
            use_face_crop=use_face_crop,
        )
        # 3) Parámetros de inferencia.
        p = get_infer_params()
        self.sample_rate: int = int(p["sample_rate"])        # típicamente 16000
        self.tgt_fps: int = int(p["tgt_fps"])                # típicamente 25
        self.frame_num: int = int(p["frame_num"])            # frames generados por llamada
        self.motion_frames_num: int = int(p["motion_frames_num"])  # frames de solape (se descartan)
        # audio (muestras) por frame de vídeo
        self.samples_per_frame: int = self.sample_rate // self.tgt_fps
        # frames "nuevos" por slice (los de solape se reusan como contexto de movimiento)
        self.slice_frames: int = self.frame_num - self.motion_frames_num

        self._buf = np.zeros(0, dtype=np.float32)  # buffer de audio acumulado
        self._frame_cursor = 0                     # índice global de frame ya emitido
        self._lock = threading.Lock()

    # ── API de streaming ─────────────────────────────────────────────────────
    def warmup(self) -> None:
        """Fuerza la compilación/torch.compile (~90 s) con un trozo de silencio, para ocultarla en la preparación."""
        silence = np.zeros(self.samples_per_frame * self.frame_num, dtype=np.float32)
        for _ in self.push_audio(silence):
            pass
        # reset tras el warmup
        with self._lock:
            self._buf = np.zeros(0, dtype=np.float32)
            self._frame_cursor = 0

    def push_audio(self, audio_16k: np.ndarray) -> Iterator[np.ndarray]:
        """
        Acumula audio (16 kHz mono float32) y emite frames de vídeo (np.uint8 [H, W, 3]) en cuanto hay material
        suficiente para una 'slice'. Llamar repetidamente con los chunks que entrega el TTS (Kokoro).
        """
        with self._lock:
            self._buf = np.concatenate([self._buf, audio_16k.astype(np.float32)])
            # mientras haya audio para al menos una slice completa
            slice_samples = self.slice_frames * self.samples_per_frame
            while len(self._buf) - self._frame_cursor * self.samples_per_frame >= slice_samples:
                start_frame = self._frame_cursor
                end_frame = start_frame + self.slice_frames
                a_start = start_frame * self.samples_per_frame
                a_end = end_frame * self.samples_per_frame
                # TODO(confirmar): generate_video.py usa una ventana con contexto de motion_frames_num
                #   alrededor de [a_start, a_end]. Ajustar audio_start_idx/audio_end_idx según esa lógica exacta.
                emb = get_audio_embedding(self.pipeline, self._buf, a_start, a_end)
                frames = run_pipeline(self.pipeline, emb)          # [N, H, W, 3] 0..255
                frames = frames[self.motion_frames_num:]           # descartar solape
                self._frame_cursor = end_frame
                for f in frames:
                    yield np.asarray(f, dtype=np.uint8)

    def flush(self) -> Iterator[np.ndarray]:
        """Emite los frames del audio residual al final de un turno (rellena con silencio hasta una slice)."""
        with self._lock:
            remaining = len(self._buf) - self._frame_cursor * self.samples_per_frame
            if remaining <= 0:
                return
            pad = self.slice_frames * self.samples_per_frame - remaining
            if pad > 0:
                self._buf = np.concatenate([self._buf, np.zeros(pad, dtype=np.float32)])
        yield from self.push_audio(np.zeros(0, dtype=np.float32))
