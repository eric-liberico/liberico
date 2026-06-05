"""modal_app.py — Avatar del Oral de Spanish B como app de Modal (GPU serverless, scale-to-zero).

Reemplaza a RunPod: Modal ejecuta el bot del avatar bajo demanda (paga solo durante la sesión, $0 en
reposo) y a la vez ES el dispatch (un endpoint web que el edge llama para lanzar el bot en una sala
de LiveKit). Reutiliza la imagen :0.5 ya publicada (deps + código del bot baqueados).

Arquitectura:
    Edge create-oral-b-session  ──POST /dispatch (X-Control-Token)──►  endpoint web de Modal
                                                                        └─ .spawn(run_bot)
    run_bot (GPU): carga SoulX (del Volume) → acuña token del bot → bot.build_and_run() en la sala LiveKit

Despliegue (el usuario, con su cuenta de Modal):
    pip install modal && modal token new
    # secrets de Modal (una vez):
    modal secret create liberico-livekit  LIVEKIT_URL=... LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
    modal secret create liberico-anthropic ANTHROPIC_API_KEY=...
    modal secret create liberico-control   CONTROL_TOKEN=<un-secreto-largo>
    # descargar el modelo al Volume (una vez):
    modal run avatar-service/modal_app.py::download_model
    # subir el retrato del profesor al Volume (una vez):
    modal volume put liberico-soulx /ruta/profesor.jpg /profesor.jpg
    # desplegar el endpoint de dispatch:
    modal deploy avatar-service/modal_app.py
    # → te da la URL del endpoint; ponla en Supabase como MODAL_DISPATCH_URL (+ MODAL_CONTROL_TOKEN).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

import modal

# Imagen :0.5 (ya publicada): trae pipecat/livekit/whisper/kokoro/SoulX/CodeFormer + el código del bot.
image = modal.Image.from_registry("ghcr.io/ericpr1/liberico-avatar:0.5")

# Volume persistente para el modelo de 14 GB (+ el retrato del profesor). Se descarga una vez.
volume = modal.Volume.from_name("liberico-soulx", create_if_missing=True)
VOL = "/workspace"

app = modal.App("liberico-avatar")

SECRETS = [
    modal.Secret.from_name("liberico-livekit"),    # LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
    modal.Secret.from_name("liberico-anthropic"),  # ANTHROPIC_API_KEY
    modal.Secret.from_name("liberico-control"),    # CONTROL_TOKEN
]

GPU = os.environ.get("AVATAR_GPU", "A100")  # A100 va holgado para tiempo real; L40S es más barato (a validar).


def _mint_bot_token(room: str) -> str:
    """Token de LiveKit del bot (JWT HS256), mismo esquema que el edge."""
    key, secret = os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"]

    def b64(b: bytes) -> str:
        return base64.urlsafe_b64encode(b).decode().rstrip("=")

    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({
        "iss": key, "sub": "profesor-bot", "name": "profesor-bot", "nbf": now, "exp": now + 3600,
        "video": {"room": room, "roomJoin": True, "canPublish": True, "canSubscribe": True, "canPublishData": True},
    }).encode())
    data = f"{header}.{payload}".encode()
    return f"{header}.{payload}.{b64(hmac.new(secret.encode(), data, hashlib.sha256).digest())}"


@app.function(image=image, gpu=GPU, volumes={VOL: volume}, secrets=SECRETS, timeout=60 * 30, scaledown_window=120)
def run_bot(room: str, system_prompt: str = "", first_message: str = "", nivel: str = "SL") -> None:
    """Corre el bot del avatar unido a la sala `room` durante toda la sesión (hasta desconexión)."""
    import asyncio
    import sys

    os.environ["LIVEKIT_ROOM"] = room
    os.environ["LIVEKIT_TOKEN"] = _mint_bot_token(room)
    os.environ["SOULX_CKPT_DIR"] = f"{VOL}/models/SoulX-FlashHead-1_3B"
    os.environ["COND_IMAGE"] = os.environ.get("COND_IMAGE", f"{VOL}/profesor.jpg")
    if system_prompt:
        os.environ["EXAMINER_SYSTEM_PROMPT"] = system_prompt
    if first_message:
        os.environ["FIRST_MESSAGE"] = first_message
    os.environ["NIVEL"] = nivel

    sys.path.insert(0, "/opt/avatar-service")
    import bot  # lee las env de arriba al importarse (hace os.chdir a /opt/SoulX-FlashHead)

    asyncio.run(bot.build_and_run())


@app.function(image=image, secrets=SECRETS)
@modal.fastapi_endpoint(method="POST")
def dispatch(data: dict):
    """Endpoint que llama el edge: lanza el bot en la sala (no bloquea; el bot corre aparte)."""
    from fastapi import HTTPException

    if os.environ.get("CONTROL_TOKEN") and data.get("control_token") != os.environ["CONTROL_TOKEN"]:
        raise HTTPException(status_code=401, detail="unauthorized")
    room = (data.get("room") or "").strip()
    if not room:
        raise HTTPException(status_code=400, detail="room requerido")
    run_bot.spawn(
        room=room,
        system_prompt=data.get("system_prompt", ""),
        first_message=data.get("first_message", ""),
        nivel=data.get("nivel", "SL"),
    )
    return {"ok": True, "room": room}


@app.function(image=image, volumes={VOL: volume}, timeout=60 * 30)
def download_model() -> None:
    """Descarga el modelo SoulX-FlashHead-1_3B (~14 GB) al Volume. Ejecutar una vez: modal run ...::download_model"""
    import subprocess

    subprocess.run(["bash", "/opt/avatar-service/scripts/download_models.sh", f"{VOL}/models"], check=True)
    volume.commit()
    print("modelo descargado al Volume")
