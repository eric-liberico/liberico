# Avatar de vídeo (SoulX-FlashHead) — Registro de trabajo / Handoff

> **Propósito:** documento vivo del spike de la **Fase 0** del plan "Avatar de vídeo realista para el Oral de
> Spanish B". Sirve de **handoff**: si se acaban los créditos de Claude, otro agente (CODEX) o un humano puede
> continuar leyendo esto. Plan completo en `~/.claude/plans/quiero-cambiar-el-concepto-nested-dusk.md`.
>
> _Última actualización: 2026-06-04._

---

## 0. Objetivo del spike (Fase 0, validación SIN integrar nada en LIBerico todavía)
Validar antes de construir el `avatar-service`:
- **V1** — Benchmark de **SoulX-FlashHead** (variante Lite vs Pro): calidad, FPS, VRAM, coste.
  ✅ **GATE PASADO (2026-06-04):** el usuario aprobó la calidad de **Lite + CodeFormer**. Pipeline validado:
  **SoulX-FlashHead Lite (512², ~110 FPS) → CodeFormer (super-resolución facial → 1024²/1080) → voz Kokoro
  `em_santa`**. (Pro queda como opción premium futura, no necesaria para el MVP.)
- **V2** — TTS español (Kokoro vs Piper). ✅ HECHO (elegida voz **Kokoro `em_santa`**).
- **V3** — Revisión legal/seguridad (licencias SoulX/VividHead/LTX/Wan + privacidad de menores). ⏳ PENDIENTE.
- **V4** — Control plane con reservas/reembolsos en `create-oral-b-session` (código, sin GPU). ⏳ PENDIENTE.
- Extra pedido por el usuario: **mayor resolución** del vídeo (el modelo es 512² nativo) vía super-resolución
  facial (**CodeFormer**). ✅ HECHO — salida **1024×1024** con realce facial real (+ versión 1080 reescalada).

## 1. Estado actual (resumen ejecutivo)
- ✅ **SoulX-FlashHead Lite FUNCIONA** en una RTX 4090 (RunPod).
- ✅ Métricas V1: salida **512×512 @ 25 fps**; **~110 FPS en steady-state** (24 frames / 0.218 s por chunk) →
  ~4× tiempo real, soporta ~3 streams concurrentes en una 4090. **Warm-up único ~90 s** (torch.compile) al
  arrancar el proceso (se ocultará con "warm-on-prep" en producción).
- ✅ Genera con la **cara real del usuario** (`--use_face_crop True`) + **voz `em_santa`** en español.
- ✅ Sin `flash_attn`: usa `scaled_dot_product_attention` de PyTorch (fallback) → un problema menos.
- ✅ **Licencia del modelo = Apache-2.0** (repo y model card). Atención V3: SoulX se construye sobre **Wan2.1** y
  el VAE usa **LTX-Video** → verificar esas licencias (ver §6).
- ⚠️ **Problema gordo de infra:** los pods de RunPod se **reinician/pierden cada ~20-30 min** (probablemente
  Community/Spot interrumpible). En cada reinicio se **borra el disco local** (`/root`, `/opt`) → se pierde el
  entorno conda. Solo persiste `/workspace` (volumen de red), **pero su cuota está casi llena** con el modelo de
  13 GB. Esto ya costó 3 reinicios. **Hay que estabilizar esto antes de seguir** (ver §5).
- 📁 **Artefactos ya descargados al Mac del usuario** (a salvo de los reinicios), en `~/Desktop/`:
  - `soulx_lite_demo.mp4` — ejemplo del repo (cara `girl.png`, audio chino).
  - `soulx_lite_es.mp4` — `girl.png` + voz `em_santa` (español).
  - `profesor_avatar_512.mp4` — **cara real del usuario** + `em_santa` (512², lo más relevante).
  - `profesor_avatar_1080.mp4` — el anterior reescalado a 1080 con lanczos (interpolado, sin detalle real).
  - `profesor_avatar_SR_1024.mp4` — **CodeFormer super-resolución real, 1024², con audio** (lo mejor).
  - `profesor_avatar_SR_1080.mp4` — el SR 1024² llevado a 1080².
- ✅ **CodeFormer (super-resolución real) HECHO** — 1024² con realce facial (199 frames, 1 cara/frame), audio
  conservado. Independiente del modelo de 13 GB (solo necesita el `.mp4`).

## 2. Infra RunPod — datos
- GPU usada: **RTX 4090 (24 GB)**. CUDA 12.8. Driver 570/580.
- Disco: `/` overlay **60 GB local pero EFÍMERO** (se borra al reiniciar el pod). `/workspace` = **volumen de red
  persistente (mfs euro.runpod.net)** con **cuota casi llena** (13 GB del modelo).
- Acceso: SSH con la clave `~/.ssh/id_ed25519` del Mac (la misma de GitHub). La cadena SSH **cambia en cada
  reinicio** (IP/puerto nuevos) → el usuario la pega cuando reinicia.
- Persisten entre reinicios (en `/workspace`): repo `SoulX-FlashHead/` + `models/SoulX-FlashHead-1_3B` (13 GB) +
  los wavs (`kokoro_em_santa.wav`, etc.).
- NO persisten: `/opt/miniconda` (entorno), `/root/models/wav2vec2-base-960h`, los `.mp4` generados.

## 3. SETUP que FUNCIONA (reproducible) — entorno SoulX
Ejecutar en el pod (vía SSH o web terminal). Tarda ~10-15 min. **Instalar el entorno en `/opt` (local), NO en
`/workspace` (salta "Disk quota exceeded").**

```bash
# 0) sistema
apt-get update -qq && apt-get install -y -qq ffmpeg wget git

# 1) Miniconda en disco local
[ -d /opt/miniconda ] || { wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/mc.sh; bash /tmp/mc.sh -b -p /opt/miniconda; }
source /opt/miniconda/etc/profile.d/conda.sh

# 2) Aceptar ToS de Anaconda y crear env con conda-forge (evita el error CondaToSNonInteractiveError)
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r || true
conda create -y -n fh -c conda-forge --override-channels python=3.10   # el repo EXIGE 3.10 (mediapipe/xformers no tienen wheel para 3.12)
conda activate fh
conda install -y -c conda-forge pip                                    # asegura pip del env

# 3) Torch 2.7.1 + CUDA 12.8 (usar SIEMPRE `python -m pip`, no `pip`, para no caer en el python del sistema)
python -m pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128

# 4) Requirements del repo SIN el pin de nccl (choca con el nccl de torch)
cd /workspace/SoulX-FlashHead
grep -v "^nvidia-nccl-cu12" requirements.txt > /root/req2.txt
python -m pip install -r /root/req2.txt
python -m pip install "huggingface_hub==0.35.3"   # transformers 4.57.3 exige hub <1.0; el 1.x rompe

# 5) wav2vec2 (encoder de audio) a disco LOCAL (cuota de /workspace llena)
export HF_HOME=/root/hf_cache
python -c "from huggingface_hub import snapshot_download; snapshot_download('facebook/wav2vec2-base-960h', local_dir='/root/models/wav2vec2-base-960h')"

# 6) test de imports (debe imprimir IMPORTS_OK ... cuda True)
python -c "import torch,xfuser,mediapipe,diffusers,transformers; from flash_head.inference import get_pipeline; print('IMPORTS_OK', torch.__version__, torch.cuda.is_available())"
```

### Comando de INFERENCIA que funciona (Lite, con cara propia + voz español)
```bash
source /opt/miniconda/etc/profile.d/conda.sh && conda activate fh
export HF_HOME=/root/hf_cache
cd /workspace/SoulX-FlashHead
# resamplear la voz Kokoro (24k) a 16k mono (wav2vec espera 16k):
ffmpeg -y -i /workspace/kokoro_em_santa.wav -ac 1 -ar 16000 /root/voz16k.wav
python generate_video.py \
  --ckpt_dir models/SoulX-FlashHead-1_3B \
  --wav2vec_dir /root/models/wav2vec2-base-960h \
  --model_type lite \
  --use_face_crop True \
  --cond_image /root/profesor.jpg \
  --audio_path /root/voz16k.wav \
  --audio_encode_mode stream \
  --save_file /root/out_prof.mp4
```
- La imagen del usuario es `~/Desktop/DSC_1093.jpg` en el Mac → subir con
  `scp -P <puerto> -i ~/.ssh/id_ed25519 ~/Desktop/DSC_1093.jpg root@<ip>:/root/profesor.jpg`.
- Salida: `--save_file` (default iría a `sample_results/` en `/workspace` → cuota; usar `/root`).
- Bajar el resultado al Mac: `scp -P <puerto> -i ~/.ssh/id_ed25519 root@<ip>:/root/out_prof.mp4 ~/Desktop/`.

## 4. Super-resolución para "mayor resolución" (CodeFormer) — PENDIENTE de terminar
SoulX es **512² nativo**; para 1080p con detalle real se hace un pase de **CodeFormer** (restauración facial +
upscale, preserva identidad con `-w`). **Es independiente de SoulX**: solo necesita el `.mp4`, no el modelo 13 GB.
Mejor montarlo en un pod estable y rápido (no necesita `/workspace`):

```bash
source /opt/miniconda/etc/profile.d/conda.sh && conda activate fh   # (o un env nuevo `cf`)
cd /root
git clone https://github.com/sczhou/CodeFormer
cd CodeFormer
python -m pip install -r requirements.txt
python -m pip install realesrgan gfpgan
# PARCHE necesario con torchvision nuevo (functional_tensor eliminado). ¡OJO!: hay que parchear el
# basicsr LOCAL del repo (lo que usa `setup.py develop`), NO el de site-packages:
find /root/CodeFormer -path "*/basicsr/data/degradations.py" -exec sed -i "s/torchvision.transforms.functional_tensor/torchvision.transforms.functional/" {} \;
python basicsr/setup.py develop
python scripts/download_pretrained_models.py facelib
python scripts/download_pretrained_models.py CodeFormer
# subir el video al pod (scp out_prof.mp4 -> /root/) y restaurar:
python inference_codeformer.py -w 0.7 --input_path /root/out_prof.mp4 --face_upsample --bg_upsampler realesrgan --upscale 2 -o /root/cf_out
find /root/cf_out -name "*.mp4"   # descargar al Mac
```
_Notas:_ `-w 0.7` = equilibrio fidelidad/calidad (subir hacia 1.0 = más fiel a la cara). `--upscale 2` = 512→1024;
para 1080 exacto, escalar el resultado o usar upscale mayor. Verificar que conserva el audio (si no, remux con
ffmpeg).

## 5. ⚠️ Persistencia / estabilidad — EL PROBLEMA A RESOLVER (importante)
Los pods se pierden cada ~20-30 min y con ellos el entorno (disco local efímero). Opciones, de menor a mayor
robustez:
1. **Usar un pod On-Demand / Secure Cloud (NO Spot/Community/interrumpible).** Esto es casi seguro la causa de los
   reinicios. **Acción del usuario.**
2. **No reinstalar cada vez:** `conda pack -n fh -o /root/fh_env.tar.gz` y **bajarlo al Mac** una vez montado;
   en un pod nuevo, subirlo y `mkdir -p env && tar -xzf fh_env.tar.gz -C env && source env/bin/activate` →
   entorno en ~1 min sin reinstalar. (No se llegó a hacer por los reinicios.)
3. **Ampliar el volumen `/workspace`** (RunPod) a ~60 GB e instalar ahí el entorno (persiste, aunque los imports
   van algo más lentos por ser FS de red). **Acción del usuario (resize).**
4. **Imagen Docker propia** con entorno + modelo baqueados, en un registro (Docker Hub) → cualquier pod arranca
   listo en ~1 min. **Es la solución de producción** (coincide con el plan: "pesos baqueados en la imagen").
- **Mitigación ya aplicada:** cada vídeo generado se **descarga al Mac inmediatamente** (no se pierde el
  resultado aunque muera el pod).

## 6. Legal (V3) — ✅ RESUELTO (verde para LIBerico <$10M ARR, con condiciones)
Verificado 2026-06-04:
- **SoulX-FlashHead-1_3B**: **Apache-2.0** ✅.
- **Wan2.1** (base del modelo): **Apache-2.0** ✅ uso comercial sin restricciones.
- **LTX-Video** (VAE): *código* Apache-2.0; **pesos** bajo **LTXV Open-Weights License** → **uso comercial GRATIS
  para empresas con < $10M ARR** (LIBerico encaja). Por encima de $10M ARR haría falta licencia comercial de
  Lightricks.
- **VividHead** (dataset, CC-BY-4.0 no comercial): solo entrenamiento, **no se usa en inferencia** ✅.
- TTS **Kokoro (Apache-2.0)** ✅. Excluidos por licencia: **XTTS-v2 (no comercial)**, **CosyVoice2 (ambigua)**.

**Condiciones a cumplir (no bloqueantes):**
1. Archivo de **NOTICES/atribución**: avisos Apache-2.0 (SoulX, Wan2.1) + atribución LTX-Video (LTXV Open-Weights
   License) + versiones de modelos.
2. **No exponer/redistribuir los pesos crudos** (se corren server-side en nuestra GPU → ✅).
3. Cumplir la **Política de uso aceptable** de LTXV (un examinador IB la cumple) y **embeber como componente**.
4. **Re-evaluar si LIBerico supera $10M ARR** (entonces licencia comercial LTX).
5. **Privacidad de menores** (aparte de licencias): voz de adolescentes → consentimiento, dónde se procesa,
   retención/borrado, base GDPR, DPAs (RunPod/SFU/Anthropic/OpenAI); actualizar `src/routes/privacy.tsx`.

## 7. TTS (V2) — HECHO
- Generación con **Kokoro** (Apache-2.0) en CPU: `pip install kokoro soundfile`, `apt-get install espeak-ng`,
  `KPipeline(lang_code='e')`, voces español: `ef_dora`, `em_alex`, `em_santa`. **Elegida: `em_santa`.**
- Piper (MIT) probado como alternativa (más voces es): `python -m piper.download_voices es_ES-sharvard-medium`
  luego `piper -m /ruta/es_ES-sharvard-medium.onnx -f out.wav`.

## 8. Próximos pasos (para Claude/CODEX que retome)
1. **Estabilizar el pod** (§5 opción 1) — sin esto, nada termina.
2. ✅ **CodeFormer hecho** (1024² + 1080, en el Mac) — pendiente solo que el usuario **juzgue la calidad** y
   decida si le sirve o quiere probar la variante Pro.
3. (Opcional) Benchmark **variante Pro** en un pod **H100** (Pro NO va en tiempo real en 4090): mismo comando con
   `--model_type pro` (script `inference_script_single_gpu_pro.sh`). Comparar calidad ↔ coste.
4. ✅ **V3 legal HECHO** (§6): Wan2.1 Apache-2.0, LTX-Video LTXV-Open-Weights (comercial gratis <$10M ARR) →
   verde para LIBerico.
5. ✅ **Imagen Docker construida (con podman) y SUBIDA a GHCR:** `ghcr.io/ericpr1/liberico-avatar:0.2` (~22 GB).
   Resuelve §5: cualquier pod arranca con el entorno listo. **Pasos para usarla** (acción del usuario):
   - Hacer el **paquete GHCR público** (GitHub → Packages → liberico-avatar → Package settings → Change
     visibility → Public) **o** configurar credenciales de registro en RunPod. No hay pesos propietarios en la
     imagen (el modelo de 13 GB no está baqueado), así que público es lo más simple.
   - Pod **On-Demand** con `Container Image = ghcr.io/ericpr1/liberico-avatar:0.2`, GPU 4090/5090, disco ≥60 GB,
     volumen en `/workspace`.
   - Dentro (una vez por volumen): `bash /opt/avatar-service/scripts/download_models.sh /workspace/models`.
   - Build hecho con **podman** (sin Docker Desktop). Reconstruir: `podman build --platform linux/amd64 -t
     ghcr.io/ericpr1/liberico-avatar:0.2 avatar-service/`; push: `podman push ...` (login:
     `gh auth token | podman login ghcr.io -u EricPR1 --password-stdin`).
6. ⏳ **V4 — reservas/reembolsos** en `supabase/functions/create-oral-b-session` (código, sin GPU): reservar al
   iniciar, confirmar el cargo solo al establecerse la sesión, reembolsar si falla / no hay capacidad + cap de
   concurrencia. ← siguiente tarea de código.
7. **Bucle conversacional en vivo** del `avatar-service` (§10): **esqueleto creado**:
   - `avatar-service/soulx_stream.py` — wrapper de SoulX en **streaming** (init retrato + `push_audio`→frames),
     fundamentado en la API real (`get_pipeline`/`get_base_data`/`get_audio_embedding`/`run_pipeline`).
     **Falta validar en GPU** el TODO de la ventana de audio (comparar con `generate_video.py`).
   - `avatar-service/bot.py` — esqueleto del bot **Pipecat** (VAD→STT→Claude→Kokoro→SoulX→SFU) con la lógica IB
     ya definida. **Falta cablear** los servicios de `pipecat-ai` (pinnear versión) y el transporte del SFU.
   - Pendiente además: servicio **KokoroTTSService** para Pipecat, **clip "escuchando"** pre-renderizado
     (`assets/listening_loop.mp4`), y medir **SR en vivo** (GFPGAN/Real-ESRGAN vs 512²).

## 9. Decisiones / hechos clave (para no repetir errores)
- El repo necesita **Python 3.10** exacto (no 3.12).
- Usar **`python -m pip`** dentro del env (el `pip` suelto cae al python del sistema → error "externally-managed").
- Quitar el pin **`nvidia-nccl-cu12==2.27.3`** de requirements (conflicto con torch).
- **`huggingface_hub==0.35.3`** (no 1.x).
- Instalar entorno en **`/opt` (local)**, datos/salidas en **`/root`**; **NO** escribir en `/workspace` (cuota).
- **No** hace falta `flash_attn` ni `sageattention` (hay fallback SDPA). `sageattention==2.2.0` ni existe en PyPI.
- Aceptar **ToS de conda** + usar canal **conda-forge**.
- CodeFormer: parchear el **basicsr LOCAL del repo** (`/root/CodeFormer/basicsr/...`), no el de site-packages.
- Para no perder el entorno: usar **`avatar-service/Dockerfile`** (deps baqueadas) + pod **On-Demand** (no Spot).

## 10. Integración en vivo (flujo de extremo a extremo) — del clic a la conversación
El spike fue **offline** (audio→mp4). La conversación necesita **streaming** (SoulX tiene modo streaming:
`gradio_app_streaming.py`), orquestado con **Pipecat** en la GPU, y el audio/vídeo viaja al navegador por un
**SFU** (LiveKit/Daily). Flujo:

1. **Alumno pulsa "Iniciar preparación"** (`oral-b-sesion.tsx`) → `create-oral-b-session` (Edge): comprueba
   créditos/cuota/**cap de concurrencia**, **reserva** (V4), **enciende+precalienta** un worker GPU (carga SoulX+
   Kokoro+Whisper en VRAM; el warm-up de ~90 s queda oculto por los 15-20 min de preparación), crea **room+tokens**
   en el SFU y los devuelve al navegador.
2. **Parte 1 — Presentación:** el navegador entra en la room, publica el **micrófono** y muestra el **vídeo del
   avatar** (`AvatarProfesorVideo` = track remoto). El **bot Pipecat** entra en la misma room, recibe el audio.
   Mientras el alumno habla, el avatar **no genera vídeo** (bucle "escuchando" pre-renderizado, ahorra GPU);
   **Silero-VAD** marca turnos y **faster-whisper** transcribe (transcripción limpia).
3. **Partes 2-3 — Conversación (turn-taking):** al callar el alumno (VAD), el bot: (a) manda transcripción +
   **prompt del examinador por fase** (`buildOralBSessionPrompt`) a **Claude** → pregunta; (b) **Kokoro `em_santa`**
   la sintetiza; (c) **SoulX streaming** (retrato + audio) genera frames en tiempo real → el bot los **publica** en
   la room. El alumno responde → se repite. La máquina de estados de fases ya existe en `oral-b-sesion.tsx`.
4. **Fin → evaluación (ya construido):** worker GPU **scale-to-zero**; audio crudo → `audio-oral` → `transcribe-oral`
   **verbatim** (Criterio A); transcripción limpia por partes + verbatim → `evaluate-oral-b` → **/30** →
   `ResultadoOralB` + guardado. Créditos: **confirmar** cargo o **reembolsar** si la sesión no se estableció (V4).

**A validar al construir:** (i) **SR en vivo** — CodeFormer per-frame es offline y puede no llegar a 25 fps;
medir o usar GFPGAN/Real-ESRGAN, o servir 512² en vivo; (ii) **disponibilidad/estabilidad GPU** (pod On-Demand +
imagen Docker).
