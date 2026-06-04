# avatar-service

Servicio de **avatar de vídeo** para el Oral conversacional de Spanish B (ver el plan en
`~/.claude/plans/quiero-cambiar-el-concepto-nested-dusk.md` y el registro del spike en
`docs/avatar-soulx-spike.md`).

**Estado:** Fase 0 (validación) HECHA. Este directorio contiene de momento la **imagen Docker reproducible** del
pipeline validado, para que el entorno **no se pierda** entre reinicios de pod y como base de producción. El
**bucle conversacional en vivo** (Pipecat + SFU) aún está por construir (ver "Próximos pasos").

## Pipeline validado (Fase 0)
`SoulX-FlashHead Lite (512², ~110 FPS en RTX 4090)` → `CodeFormer (super-resolución facial → 1024²/1080)` con voz
`Kokoro em_santa` (TTS español, Apache-2.0). Licencias verificadas para uso comercial <$10M ARR (ver doc §6).

## Contenido
- `Dockerfile` — baquea todas las dependencias (lo que tardaba 15 min y se perdía en cada reinicio): torch
  2.7.1+cu128, requisitos de SoulX (sin el pin de nccl), `huggingface_hub==0.35.3`, CodeFormer + pesos + parche
  de `basicsr`, wav2vec2, Kokoro. **NO** baquea el modelo SoulX de 13 GB (se descarga aparte).
- `scripts/download_models.sh` — descarga el modelo SoulX (13 GB) a un volumen persistente (una vez por volumen).
- `scripts/generate_demo.sh` — pipeline OFFLINE: `retrato + voz → 512² → SR 1024²` (lo que se validó).

## Uso
```bash
# 1) Construir y subir la imagen (en una máquina con Docker)
docker build -t <usuario>/liberico-avatar:0.1 avatar-service/
docker push <usuario>/liberico-avatar:0.1

# 2) En RunPod: crear un pod ON-DEMAND (no Spot) con esa imagen, GPU RTX 4090/5090, disco >=60 GB,
#    y un volumen persistente montado en /workspace.

# 3) Dentro del pod (una vez por volumen): descargar el modelo grande
bash /opt/avatar-service/scripts/download_models.sh /workspace/models

# 4) Probar el pipeline offline
bash /opt/avatar-service/scripts/generate_demo.sh /ruta/retrato.jpg /ruta/voz.wav
#   -> /workspace/out/avatar_512.mp4 y /workspace/out/avatar_SR_1024.mp4
```

## Por qué esto resuelve el problema de persistencia
Los pods de RunPod borran el disco local (`/opt`, `/root`) al reiniciar → se perdía el entorno conda. Con la
imagen Docker, **cualquier pod arranca con todo instalado en ~1 min**. Solo el modelo de 13 GB vive en el volumen
persistente `/workspace`. Además: usar pods **On-Demand/Secure** (no Spot) evita los reinicios frecuentes.

## Próximos pasos (construir el servicio en vivo — tras el gate)
1. Añadir al `Dockerfile` la orquestación: **Pipecat** + **faster-whisper** (STT) + cliente **SFU** (LiveKit/Daily).
2. Escribir el **bot Pipecat** (`bot.py`): VAD (Silero) → STT (faster-whisper) → LLM (Claude API, reusando los
   prompts `buildOralBSessionPrompt`) → TTS (Kokoro) → **SoulX en modo streaming** (`gradio_app_streaming.py` como
   referencia) → publica audio+vídeo en la room del SFU.
3. **Validar SR en vivo**: CodeFormer per-frame es offline; medir si cabe a 25 fps o usar GFPGAN/Real-ESRGAN, o
   servir 512² en vivo.
4. Conectar con LIBerico: repuntar `supabase/functions/create-oral-b-session` (warm-up + room/tokens + dispatch +
   reservas/reembolsos V4) y `src/routes/oral-b-sesion.tsx`/`AvatarProfesorVideo` al cliente SFU.

Ver el flujo de integración completo en `docs/avatar-soulx-spike.md` §10.
