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

ESTADO: lógica de ventana **validada en GPU** (RTX 5090): replica el bucle `audio_encode_mode == 'stream'` de
generate_video.py (deque de audio de tamaño fijo `cached_audio_duration·sr` + índices audio_start/end FIJOS +
descarte de `motion_frames_num`). Benchmark: RTF≈0.19 (≈5× más rápido que tiempo real, ~128 FPS a 512²).
Ver `scripts/bench_stream.py` y docs/avatar-soulx-spike.md §M6-gate.
"""

from __future__ import annotations

import threading
from collections import deque
from typing import Iterator

import numpy as np
import torch

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
        # 3) Parámetros de inferencia (idénticos a generate_video.py).
        p = get_infer_params()
        self.sample_rate: int = int(p["sample_rate"])              # típicamente 16000
        self.tgt_fps: int = int(p["tgt_fps"])                      # típicamente 25
        self.frame_num: int = int(p["frame_num"])                  # frames generados por llamada
        self.motion_frames_num: int = int(p["motion_frames_num"])  # frames de solape (se descartan)
        cached_audio_duration: int = int(p["cached_audio_duration"])  # s de audio en la ventana deslizante

        # frames "nuevos" por slice (los de solape se reusan como contexto de movimiento)
        self.slice_frames: int = self.frame_num - self.motion_frames_num
        # muestras de audio por slice (= human_speech_array_slice_len del repo)
        self.slice_samples: int = self.slice_frames * self.sample_rate // self.tgt_fps
        # ventana deslizante de audio de tamaño fijo + índices FIJOS de embedding (clave del modo stream)
        self._cached_len: int = self.sample_rate * cached_audio_duration
        self._audio_end_idx: int = cached_audio_duration * self.tgt_fps
        self._audio_start_idx: int = self._audio_end_idx - self.frame_num

        self._buf = np.zeros(0, dtype=np.float32)                 # audio aún no consumido
        self._dq: deque[float] = deque([0.0] * self._cached_len, maxlen=self._cached_len)
        self._lock = threading.Lock()

    # ── API de streaming ─────────────────────────────────────────────────────
    def warmup(self) -> None:
        """Fuerza la compilación/torch.compile (1er chunk ~lento) con silencio, para ocultarla en la preparación."""
        silence = np.zeros(self.slice_samples, dtype=np.float32)
        for _ in self.push_audio(silence):
            pass
        self.reset()

    def reset(self) -> None:
        """Reinicia el estado de audio (entre sesiones). No recarga pesos."""
        with self._lock:
            self._buf = np.zeros(0, dtype=np.float32)
            self._dq = deque([0.0] * self._cached_len, maxlen=self._cached_len)

    def _consume_slice(self, slice_audio: np.ndarray) -> Iterator[np.ndarray]:
        """Procesa exactamente una slice (mirror del bucle stream de generate_video.py)."""
        self._dq.extend(slice_audio.tolist())
        audio_array = np.array(self._dq)
        emb = get_audio_embedding(self.pipeline, audio_array, self._audio_start_idx, self._audio_end_idx)
        video = run_pipeline(self.pipeline, emb)          # torch [N, H, W, 3], 0..255
        video = video[self.motion_frames_num:]            # descartar solape (cada chunk, como el repo)
        frames = video.to(torch.uint8).cpu().numpy()
        for f in frames:
            yield f

    def push_audio(self, audio_16k: np.ndarray) -> Iterator[np.ndarray]:
        """
        Acumula audio (16 kHz mono float32) y emite frames (np.uint8 [H, W, 3]) en cuanto hay una 'slice'
        completa. Llamar repetidamente con los chunks que entrega el TTS (Kokoro).
        """
        with self._lock:
            self._buf = np.concatenate([self._buf, audio_16k.astype(np.float32)])
            while len(self._buf) >= self.slice_samples:
                slice_audio = self._buf[: self.slice_samples]
                self._buf = self._buf[self.slice_samples:]
                yield from self._consume_slice(slice_audio)

    def flush(self) -> Iterator[np.ndarray]:
        """Al final de un turno: rellena con silencio hasta completar la última slice y la emite."""
        with self._lock:
            if len(self._buf) == 0:
                return
            pad = self.slice_samples - len(self._buf)
            slice_audio = np.concatenate([self._buf, np.zeros(max(pad, 0), dtype=np.float32)])[: self.slice_samples]
            self._buf = np.zeros(0, dtype=np.float32)
            yield from self._consume_slice(slice_audio)
