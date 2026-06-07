#!/usr/bin/env python3
"""Benchmark del GATE de M6: ¿SoulX-FlashHead Lite genera en STREAMING a tiempo real?

Replica EXACTAMENTE el bucle `audio_encode_mode == 'stream'` de generate_video.py del repo
(deque de audio de tamaño fijo + índices audio_start/end fijos + descarte de motion_frames),
midiendo el coste por chunk. Es el número que decide la arquitectura en vivo:

    budget_por_chunk = slice_len / tgt_fps   (segundos de vídeo que produce cada chunk)
    real-time  ⇔  coste_medio_por_chunk  ≤  budget_por_chunk   (RTF ≤ 1)

Si RTF ≤ 1 (excluyendo el primer chunk, que paga la compilación) → el avatar puede ir en vivo a 512².
Si RTF > 1 → hay que servir menos frames, bajar resolución, o renunciar a SR en vivo.

Uso (en el pod, dentro de /opt/SoulX-FlashHead para que el repo esté en el path):
    cd /opt/SoulX-FlashHead
    python /root/avatar-service/scripts/bench_stream.py --audio /workspace/out/voz16k.wav
"""
from __future__ import annotations

import argparse
import time
from collections import deque

import numpy as np
import torch

from flash_head.inference import (
    get_audio_embedding,
    get_base_data,
    get_infer_params,
    get_pipeline,
    run_pipeline,
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default="/workspace/models/SoulX-FlashHead-1_3B")
    ap.add_argument("--wav2vec", default="/opt/models/wav2vec2-base-960h")
    ap.add_argument("--image", default="/root/profesor.jpg")
    ap.add_argument("--audio", default="/workspace/out/voz16k.wav")
    ap.add_argument("--model_type", default="lite")
    args = ap.parse_args()

    import librosa  # del repo

    print(f"[init] cargando pipeline ({args.model_type})…", flush=True)
    pipeline = get_pipeline(
        world_size=1, ckpt_dir=args.ckpt, wav2vec_dir=args.wav2vec, model_type=args.model_type
    )
    get_base_data(pipeline, cond_image_path_or_dir=args.image, base_seed=42, use_face_crop=True)
    p = get_infer_params()
    sr = p["sample_rate"]
    fps = p["tgt_fps"]
    cad = p["cached_audio_duration"]
    fn = p["frame_num"]
    mf = p["motion_frames_num"]
    slice_len = fn - mf
    slice_samples = slice_len * sr // fps
    budget = slice_len / fps  # s de vídeo por chunk
    cached_len = sr * cad
    audio_end_idx = cad * fps
    audio_start_idx = audio_end_idx - fn

    print(
        f"[params] sr={sr} fps={fps} frame_num={fn} motion={mf} slice_len={slice_len} "
        f"cached_audio_duration={cad}s | budget/chunk={budget*1000:.0f} ms "
        f"({slice_len} frames)",
        flush=True,
    )

    audio, _ = librosa.load(args.audio, sr=sr, mono=True)
    rem = len(audio) % slice_samples
    if rem > 0:
        audio = np.concatenate([audio, np.zeros(slice_samples - rem, dtype=audio.dtype)])
    slices = audio.reshape(-1, slice_samples)
    print(f"[audio] {len(audio)/sr:.1f}s → {len(slices)} chunks de {budget*1000:.0f} ms", flush=True)

    dq = deque([0.0] * cached_len, maxlen=cached_len)
    times = []
    for i, s in enumerate(slices):
        torch.cuda.synchronize()
        t0 = time.time()
        dq.extend(s.tolist())
        emb = get_audio_embedding(pipeline, np.array(dq), audio_start_idx, audio_end_idx)
        video = run_pipeline(pipeline, emb)
        video = video[mf:]
        torch.cuda.synchronize()
        dt = time.time() - t0
        times.append(dt)
        rtf = dt / budget
        flag = "OK" if rtf <= 1.0 else "LENTO"
        print(
            f"  chunk {i:2d}: {dt*1000:6.0f} ms  ({video.shape[0]} frames)  RTF={rtf:.2f} {flag}"
            + ("  [incluye compilación]" if i == 0 else ""),
            flush=True,
        )

    steady = times[1:] if len(times) > 1 else times
    mean = sum(steady) / len(steady)
    rtf = mean / budget
    print("\n===== VEREDICTO (excluyendo chunk 0) =====")
    print(f"  coste medio/chunk: {mean*1000:.0f} ms | budget: {budget*1000:.0f} ms | RTF={rtf:.2f}")
    print(f"  FPS efectivo: {slice_len/mean:.1f} (objetivo: {fps})")
    if rtf <= 1.0:
        print("  ✅ TIEMPO REAL a 512²: el avatar en vivo es viable sin trucos.")
    elif rtf <= 1.3:
        print("  ⚠️ CASI: viable con buffer pequeño / quitar SR en vivo / leve bajada de fps.")
    else:
        print("  ❌ NO en tiempo real: servir menos frames, bajar resolución o pre-render por turnos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
