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
from pathlib import Path

import modal

# Imagen :0.5 (ya publicada): trae pipecat/livekit/whisper/kokoro/SoulX/CodeFormer + deps.
# Superponemos el código local de avatar-service para correr SIEMPRE el bot actual (con datachannel)
# sin tener que rebakear la imagen en cada cambio.
image = (
    modal.Image.from_registry("ghcr.io/ericpr1/liberico-avatar:0.5")
    .add_local_dir(str(Path(__file__).parent), "/opt/avatar-service")
)

# Volume persistente para el modelo de 14 GB (+ el retrato del profesor). Se descarga una vez.
volume = modal.Volume.from_name("liberico-soulx", create_if_missing=True)
VOL = "/workspace"

# Caché de compilación de torch.compile/inductor + triton, persistida en el Volume. SoulX usa inductor
# (de ahí los pasos de denoise/decode/encode de ~100 s en el 1er arranque: es COMPILACIÓN, no inferencia).
# Sin persistir, esa compilación (~5 min) se repite en CADA cold-start. Apuntando estas cachés al Volume,
# la compilación se paga una sola vez (`prime_cache`) y los arranques siguientes hacen cache-hit → el
# cold-start baja de ~7 min a la carga de modelo (~1 min). Cebar tras desplegar: modal run ...::prime_cache
COMPILE_CACHE = f"{VOL}/compile_cache"


def _set_compile_cache_env() -> None:
    """Apunta inductor/triton + caché de modelos HF (Whisper) al Volume. Llamar ANTES de importar torch/STT."""
    os.environ.setdefault("TORCHINDUCTOR_CACHE_DIR", f"{COMPILE_CACHE}/inductor")
    os.environ.setdefault("TRITON_CACHE_DIR", f"{COMPILE_CACHE}/triton")
    os.environ.setdefault("TORCHINDUCTOR_FX_GRAPH_CACHE", "1")
    # Caché de Hugging Face en el Volume → el modelo Whisper (large-v3, ~3 GB) se descarga UNA vez y persiste
    # entre cold-starts (si no, se re-descargaría en cada arranque y alargaría/rompería el inicio).
    os.environ.setdefault("HF_HOME", f"{VOL}/hf_cache")
    Path(f"{COMPILE_CACHE}/inductor").mkdir(parents=True, exist_ok=True)
    Path(f"{COMPILE_CACHE}/triton").mkdir(parents=True, exist_ok=True)
    Path(f"{VOL}/hf_cache").mkdir(parents=True, exist_ok=True)

app = modal.App("liberico-avatar")

SECRETS = [
    modal.Secret.from_name("liberico-livekit"),    # LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
    modal.Secret.from_name("liberico-anthropic"),  # ANTHROPIC_API_KEY
    modal.Secret.from_name("liberico-control"),    # CONTROL_TOKEN
]

GPU = os.environ.get("AVATAR_GPU", "A100")  # A100 va holgado para tiempo real; L40S es más barato (a validar).
# Tope de sesiones en PARALELO (1 alumno = 1 GPU). Cap de coste/cuota: más allá, las nuevas esperan en cola.
# Súbelo cuando tengas demanda y límites de Modal ampliados.
MAX_PARALLEL = int(os.environ.get("AVATAR_MAX_PARALLEL", "3"))


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


# timeout=25 min: cortafuegos de INFRA por encima de los cortes internos del bot (corte duro de 15 min del
# oral + guards de sala vacía/espera). Cubre el warm-up lanzado en la cola de la preparación (~3 min) + el
# oral (15 min) + margen. La cota REAL de coste son los guards del bot, no este timeout.
# max_containers: tope de GPUs en paralelo (1 alumno = 1 GPU). min_containers=0 → scale-to-zero ($0 en reposo).
@app.function(
    image=image, gpu=GPU, volumes={VOL: volume}, secrets=SECRETS,
    timeout=60 * 25, scaledown_window=60, max_containers=MAX_PARALLEL, min_containers=0,
)
def run_bot(room: str, system_prompt: str = "", first_message: str = "", nivel: str = "SL") -> None:
    """Corre el bot del avatar unido a la sala `room` durante toda la sesión (hasta desconexión)."""
    import asyncio
    import sys

    _set_compile_cache_env()  # cache-hit de la compilación → cold-start corto (antes de importar bot/torch)
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


@app.function(image=image, gpu=GPU, volumes={VOL: volume}, secrets=SECRETS, timeout=60 * 15)
def prime_cache() -> None:
    """Ceba la caché de compilación en el Volume: corre el warm-up de SoulX UNA vez (paga los ~5 min de
    compilación) y persiste inductor/triton en el Volume. Tras esto, run_bot arranca con cache-hit.
    Ejecutar una vez tras cada cambio de imagen/torch: modal run avatar-service/modal_app.py::prime_cache"""
    import sys
    import time

    _set_compile_cache_env()
    os.environ["SOULX_CKPT_DIR"] = f"{VOL}/models/SoulX-FlashHead-1_3B"
    os.environ["COND_IMAGE"] = os.environ.get("COND_IMAGE", f"{VOL}/profesor.jpg")
    sys.path.insert(0, "/opt/avatar-service")
    os.chdir(os.environ.get("SOULX_REPO", "/opt/SoulX-FlashHead"))  # flash_head abre rutas relativas

    from soulx_stream import SoulXStreamer  # type: ignore

    t0 = time.time()
    streamer = SoulXStreamer(
        ckpt_dir=os.environ["SOULX_CKPT_DIR"],
        wav2vec_dir=os.environ.get("WAV2VEC_DIR", "/opt/models/wav2vec2-base-960h"),
        cond_image=os.environ["COND_IMAGE"],
        model_type="lite", use_face_crop=False,
    )
    streamer.warmup()
    print(f"warmup (con compilación) en {time.time()-t0:.0f}s")

    # Descarga del modelo Whisper (verbatim del Criterio A) al Volume, para que no se baje en cada cold-start.
    stt_model = os.environ.get("STT_MODEL", "large-v3")
    try:
        from faster_whisper import WhisperModel  # type: ignore

        t1 = time.time()
        WhisperModel(stt_model, device="cuda", compute_type="float16")
        print(f"modelo Whisper '{stt_model}' descargado/cacheado en {time.time()-t1:.0f}s")
    except Exception as e:  # noqa: BLE001
        print(f"aviso: no se pudo precachear Whisper '{stt_model}': {e}")

    volume.commit()  # persiste caché de compilación + modelo Whisper recién escritos
    print(f"caché persistida en {COMPILE_CACHE} y {VOL}/hf_cache")


@app.function(image=image, gpu=GPU, timeout=120)
def gpu_check() -> None:
    """Diagnóstico: ¿torch ve el GPU de Modal y va rápido? modal run ...::gpu_check"""
    import time

    import torch

    print("torch:", torch.__version__, "| cuda disp:", torch.cuda.is_available())
    print("built cuda:", torch.version.cuda)
    if torch.cuda.is_available():
        print("device:", torch.cuda.get_device_name(0))
        x = torch.randn(4096, 4096, device="cuda")
        torch.cuda.synchronize()
        t0 = time.time()
        for _ in range(20):
            x = x @ x
        torch.cuda.synchronize()
        print(f"matmul 4096³ x20: {(time.time()-t0)*1000:.0f} ms (rápido = GPU OK)")
    import subprocess
    subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version", "--format=csv,noheader"])


@app.function(image=image, volumes={VOL: volume}, timeout=60 * 30)
def download_model() -> None:
    """Descarga el modelo SoulX-FlashHead-1_3B (~14 GB) al Volume. Ejecutar una vez: modal run ...::download_model"""
    import subprocess

    subprocess.run(["bash", "/opt/avatar-service/scripts/download_models.sh", f"{VOL}/models"], check=True)
    volume.commit()
    print("modelo descargado al Volume")
