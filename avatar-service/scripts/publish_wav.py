#!/usr/bin/env python3
"""Harness de prueba: se une a la room de LiveKit como "alumno" y publica un WAV como micrófono.

Permite iterar el turno conversacional del bot (VAD→STT→Claude→Kokoro→SoulX) SIN un navegador
ni una persona hablando. Publica el audio en tiempo real (con silencio al inicio y al final para
que el VAD detecte un turno limpio), espera unos segundos a que el bot responda, y se va.

Uso (en el pod):
    LIVEKIT_URL=... LIVEKIT_TOKEN=<token-de-alumno> python scripts/publish_wav.py --wav student.wav
"""
from __future__ import annotations

import argparse
import asyncio
import os

import librosa
import numpy as np
from livekit import rtc

SR = 48000          # LiveKit publica a 48 kHz
FRAME_MS = 10       # frames de 10 ms


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", required=True)
    ap.add_argument("--start-delay", type=float, default=0.0, help="s a esperar tras unirse antes de hablar (deja terminar el saludo)")
    ap.add_argument("--lead-silence", type=float, default=0.6, help="s de silencio antes del habla")
    ap.add_argument("--tail-silence", type=float, default=1.2, help="s de silencio tras el habla (cierra el turno)")
    ap.add_argument("--wait", type=float, default=18.0, help="s a esperar la respuesta del bot antes de salir")
    args = ap.parse_args()

    url = os.environ["LIVEKIT_URL"]
    token = os.environ["LIVEKIT_TOKEN"]

    room = rtc.Room()

    @room.on("data_received")
    def _on_data(packet: rtc.DataPacket) -> None:  # valida el datachannel del bot (lo que verá la UI)
        try:
            print(f"[harness] DATA → {packet.data.decode('utf-8')}")
        except Exception:
            print(f"[harness] DATA(raw) {packet!r}")

    await room.connect(url, token)
    print(f"[harness] conectado a {room.name} como {room.local_participant.identity}")

    source = rtc.AudioSource(SR, 1)
    track = rtc.LocalAudioTrack.create_audio_track("alumno-mic", source)
    await room.local_participant.publish_track(
        track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    )

    if args.start_delay > 0:
        print(f"[harness] esperando {args.start_delay:.0f}s (que acabe el saludo) antes de hablar…")
        await asyncio.sleep(args.start_delay)

    audio, _ = librosa.load(args.wav, sr=SR, mono=True)
    lead = np.zeros(int(SR * args.lead_silence), dtype=np.float32)
    tail = np.zeros(int(SR * args.tail_silence), dtype=np.float32)
    pcm = (np.clip(np.concatenate([lead, audio, tail]), -1, 1) * 32767).astype("<i2")

    fs = SR * FRAME_MS // 1000
    print(f"[harness] publicando {len(pcm)/SR:.1f}s de audio…")
    for i in range(0, len(pcm), fs):
        chunk = pcm[i : i + fs]
        if chunk.size < fs:
            chunk = np.pad(chunk, (0, fs - chunk.size))
        await source.capture_frame(
            rtc.AudioFrame(data=chunk.tobytes(), sample_rate=SR, num_channels=1, samples_per_channel=fs)
        )
        await asyncio.sleep(FRAME_MS / 1000)

    print(f"[harness] audio enviado; esperando {args.wait:.0f}s la respuesta del bot…")
    await asyncio.sleep(args.wait)
    await room.disconnect()
    print("[harness] fin")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
