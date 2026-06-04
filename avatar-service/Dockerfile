# Imagen reproducible del pipeline de avatar validado en la Fase 0:
#   SoulX-FlashHead (Lite, 512²) + CodeFormer (super-resolución facial) + Kokoro (TTS es) + faster-whisper.
#
# Objetivo: que el entorno NO se vuelva a perder al reiniciar un pod de RunPod.
# Construye una vez, súbela a un registro (Docker Hub / GHCR) y úsala como template del pod → arranca listo.
#
# IMPORTANTE: este Dockerfile NO baquea el modelo SoulX de 13 GB (haría la imagen enorme). Los pesos se
# descargan en el primer arranque a /workspace (volumen persistente) con scripts/download_models.sh,
# o móntalos desde un volumen. Sí baquea: todas las dependencias (lo que tardaba 15 min y se perdía),
# CodeFormer + sus pesos, wav2vec2 y Kokoro.
#
# Build (en una máquina con Docker, idealmente con GPU para probar):
#   docker build -t <tu-usuario>/liberico-avatar:0.1 avatar-service/
#   docker push <tu-usuario>/liberico-avatar:0.1
# En RunPod: crea el pod con esa imagen como "Container Image".

FROM nvidia/cuda:12.8.0-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/hf_cache \
    PIP_NO_CACHE_DIR=1

# ── Sistema (Ubuntu 22.04 trae Python 3.10, que es justo el que exige SoulX) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.10 python3-pip python3.10-dev \
        git wget ffmpeg espeak-ng build-essential ninja-build \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# ── PyTorch 2.7.1 + CUDA 12.8 (versiones verificadas) ──
RUN python -m pip install --upgrade pip && \
    python -m pip install torch==2.7.1 torchvision==0.22.1 \
        --index-url https://download.pytorch.org/whl/cu128

WORKDIR /opt

# ── SoulX-FlashHead + deps (sin el pin de nccl que choca con torch) ──
RUN git clone --depth 1 https://github.com/Soul-AILab/SoulX-FlashHead.git
RUN cd SoulX-FlashHead && \
    grep -v '^nvidia-nccl-cu12' requirements.txt > /tmp/req_soulx.txt && \
    python -m pip install -r /tmp/req_soulx.txt && \
    python -m pip install 'huggingface_hub==0.35.3'
# Encoder de audio (pequeño): se baquea
RUN python -c "from huggingface_hub import snapshot_download; \
    snapshot_download('facebook/wav2vec2-base-960h', local_dir='/opt/models/wav2vec2-base-960h')"

# ── CodeFormer (super-resolución facial) + parche basicsr (functional_tensor) ──
RUN git clone --depth 1 https://github.com/sczhou/CodeFormer.git
RUN cd CodeFormer && \
    python -m pip install -r requirements.txt && \
    python -m pip install realesrgan gfpgan && \
    # Parchear TODOS los basicsr (el local del repo Y el de site-packages que instalan realesrgan/gfpgan):
    find / -path '*/basicsr/data/degradations.py' \
        -exec sed -i 's/torchvision.transforms.functional_tensor/torchvision.transforms.functional/' {} \; 2>/dev/null; \
    python basicsr/setup.py develop && \
    python scripts/download_pretrained_models.py facelib && \
    python scripts/download_pretrained_models.py CodeFormer

# ── TTS español (Kokoro, Apache-2.0) ──
RUN python -m pip install kokoro soundfile && \
    python -c "from kokoro import KPipeline; KPipeline(lang_code='e')" || true  # precarga voces es

# ── (Futuro) orquestación en vivo: Pipecat + faster-whisper + cliente SFU ──
# Descomenta cuando se construya el avatar-service real (bucle conversacional):
# RUN python -m pip install faster-whisper "pipecat-ai[silero,daily]" livekit

# ── SSH server (acceso directo + scp por "exposed TCP" de RunPod) ──
RUN apt-get update && apt-get install -y --no-install-recommends openssh-server && \
    mkdir -p /run/sshd && rm -rf /var/lib/apt/lists/*

COPY scripts/ /opt/avatar-service/scripts/
COPY start.sh /opt/avatar-service/start.sh
RUN chmod +x /opt/avatar-service/scripts/*.sh /opt/avatar-service/start.sh

WORKDIR /opt/SoulX-FlashHead
EXPOSE 22
# start.sh: inyecta $PUBLIC_KEY (RunPod), arranca sshd y mantiene el contenedor vivo
# (un CMD que termina hace que el pod se pare → ni web terminal ni SSH).
CMD ["/opt/avatar-service/start.sh"]
