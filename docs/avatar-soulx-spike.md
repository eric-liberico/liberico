# Avatar de vídeo (SoulX-FlashHead) — Registro de trabajo / Handoff

> **Propósito:** documento vivo del spike de la **Fase 0** del plan "Avatar de vídeo realista para el Oral de
> Spanish B". Sirve de **handoff**: si se acaban los créditos de Claude, otro agente (CODEX) o un humano puede
> continuar leyendo esto. Plan completo en `~/.claude/plans/quiero-cambiar-el-concepto-nested-dusk.md`.
>
> _Última actualización: 2026-06-05._ El spike (Fase 0) está SUPERADO y la feature está **desplegada
> end-to-end en serverless** (Modal + LiveKit + Supabase). Lee **§1 (ESTADO ACTUAL)** primero: es el handoff vivo.

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

## 1. ESTADO ACTUAL (2026-06-05) — leer esto primero (handoff para CODEX)

El avatar conversacional **funciona, está aprobado por el usuario y desplegado end-to-end** en arquitectura
serverless de pago-por-uso. Lo único que bloquea la demo final es el **límite de gasto de la cuenta de Modal**
(lo sube el usuario). Rama: **`feat/oral-b-conversacional`** (PR #15). Último commit relevante: `44e9662`.

### ✅ HECHO y validado
- **Avatar en vivo (M6):** alumno habla → VAD → Whisper (es) → Claude Haiku (examinador) → Kokoro `em_santa`
  → SoulX (vídeo 1024²) por **LiveKit**. Probado en navegador; el usuario dijo *"me gusta mucho así"*.
- **Sync A/V correcto:** pacer único a 25 fps emite cada frame de vídeo CON sus 40 ms de audio → WebRTC sincroniza
  por timestamp (sin audio adelantado ni cortes). Saludo en `on_audio_track_subscribed`. Vídeo 1024² = **upscale
  cúbico cosmético** desde 512² nativo (SR real por frame NO cabe en 1 GPU: medido 128-228 ms/frame).
- **Imagen reproducible `:0.5`** en GHCR (`ghcr.io/ericpr1/liberico-avatar:0.5`) = deps en vivo
  (`pipecat-ai[silero] faster-whisper livekit livekit-api anthropic tenacity mediapipe>=0.10.18`) + código del bot.
- **Integración LIBerico (code-complete, tsc/lint/build/deno verde):** `create-oral-b-session` crea sala LiveKit +
  token (JWT HS256) + llama al dispatch de Modal; `src/lib/oral-livekit.ts` (cliente); `AvatarProfesorVideo`
  (pista remota); `oral-b-sesion.tsx` (fases + botón "Parar el oral"). El bot publica transcripciones+modo por
  datachannel (`{type:"transcript",source,text}` / `{type:"mode",...}`).
- **Worker dispatch en Modal (`avatar-service/modal_app.py`)** — DESPLEGADO y GPU validada:
  - `run_bot` (GPU **A100**): SoulX corre a **tiempo real** (0.042 s/step, ~5× margen). El "104 s" del 1er step es
    coste único de compilación en frío → **cold-start ~3-4 min** (se esconde en la fase de preparación del oral).
  - `dispatch` (endpoint web, auth `control_token`): el edge lo llama → `run_bot.spawn()`. URL desplegada:
    `https://epetterssonruiz--liberico-avatar-dispatch.modal.run`.
  - **scale-to-zero** confirmado ($0 en reposo). **`max_containers=3`** = tope de sesiones en paralelo (1 alumno =
    1 GPU; ajustable con `AVATAR_MAX_PARALLEL`).
- **Salvaguardas de coste/tiempo (5 capas)** en el bot: genera solo con alumno presente; watchdog 150 s si nadie
  entra; fin al desconectarse (botón Parar); **corte duro 15 min** (`task.cancel()` + `os._exit(0)`, garantizado);
  **timeout de Modal 20 min** (garantía de infra). Ningún bot puede quedarse corriendo.
- **Secrets puestos:** Supabase (`LIVEKIT_URL/API_KEY/API_SECRET`, `MODAL_DISPATCH_URL`, `MODAL_CONTROL_TOKEN`);
  Modal (`liberico-livekit`, `liberico-anthropic`, `liberico-control`). Edge `create-oral-b-session` **desplegado**.
  Modelo de 14 GB en el Modal Volume `liberico-soulx` (`/models/...`) + retrato en `/profesor.jpg`.

### ⏳ PENDIENTE
1. **Subir el límite de gasto en Modal** (lo hace el usuario en https://modal.com/settings/usage). Bloquea el
   redeploy y la demo final. La app está `modal app stop`-eada ahora mismo (0 coste).
2. **Demo final en vivo** por el path real: redeploy de Modal (`modal deploy avatar-service/modal_app.py`) y probar
   desde LIBerico (o el demo `avatar-service/demo/`). Validar en vivo: botón Parar + corte 15 min (la ruta
   `task.cancel()` no se ha probado en vivo, pero `os._exit`+timeout de Modal lo garantizan igual).
3. **Refinamientos:** (a) edge con **cap global + cola** y mensaje "inténtalo en unos minutos" sin cobrar crédito
   cuando se llena `max_containers` (hoy la sesión nº4 simplemente espera en cola); (b) **multiplexar** 2-3 alumnos
   por GPU (hay margen) para abaratar; (c) **TTS de pago** (Cartesia/ElevenLabs ~$0.10/min) si la voz de Kokoro
   (prosodia plana) no convence — es el mayor salto de calidad pendiente; (d) rebakear `:0.6` con el bot actual
   (en `:0.5` el bot es anterior; Modal lo suple con `add_local_dir`, pero RunPod/otros usos no).
4. **Seguridad:** el usuario debe **rotar** las claves pegadas en chat (Anthropic, `LIVEKIT_API_SECRET`, token de
   Modal). Guardadas en su Keychain: `liberico-anthropic-test`, `liberico-livekit-*`, `liberico-control-token`.
5. **V3 legal** (privacidad de menores, licencias) y **V4** reservas/reembolsos finos — ver el plan. La migración
   `20260601400000_oral_b_sesion.sql` **no está desplegada** (la feature no está en producción aún).

### Cómo retomar la demo (CODEX/usuario, cuando Modal tenga límite)
```bash
MODAL=~/Library/Python/3.9/bin/modal   # modal token ya configurado (perfil epetterssonruiz)
$MODAL deploy avatar-service/modal_app.py        # redeploy
# probar el dispatch (CONTROL_TOKEN en Keychain: liberico-control-token):
CTL=$(security find-generic-password -s liberico-control-token -w)
curl -s -X POST https://epetterssonruiz--liberico-avatar-dispatch.modal.run \
  -H 'Content-Type: application/json' -d "{\"control_token\":\"$CTL\",\"room\":\"oral-demo\",\"nivel\":\"SL\"}"
$MODAL app logs liberico-avatar      # ver el bot arrancar (cold-start ~3-4 min)
```
Entorno local: **solo `bun`** (no npm/node) → `bunx tsc/eslint/vite`. Modal CLI en `~/Library/Python/3.9/bin/modal`.
Las notas históricas del spike (RunPod, CodeFormer offline, etc.) siguen abajo (§2-§10) por contexto.

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
5. ✅ **Imagen Docker construida (con podman), SUBIDA a GHCR y VALIDADA end-to-end:**
   `ghcr.io/ericpr1/liberico-avatar:0.4` (= `:latest`, ~22 GB). El paquete GHCR ya es **público**.
   Resuelve §5: cualquier pod arranca con el entorno listo.
   - ✅ **Smoke test PASADO** (2026-06-04) en pod On-Demand **RTX 5090** con `:0.3`: descarga del modelo de 13 GB
     a `/workspace` en ~30 s, `generate_demo.sh` → `avatar_512.mp4` (SoulX Lite) → **CodeFormer SR → 1024²** →
     descargado a `~/Desktop/avatar_5090_SR_1024.mp4`. scp directo OK por SSH "exposed TCP".
   - ⚠️ **Único fallo encontrado y corregido:** `:0.3` no incluía el paquete pip **`ffmpeg-python`** (el módulo
     `import ffmpeg` que usa `CodeFormer/basicsr/utils/video_util.py` para VideoReader/Writer). `:0.4` ya lo
     baquea (`Dockerfile`: `pip install realesrgan gfpgan ffmpeg-python`). En el pod actual se instaló en vivo.
   - **Pasos para usarla:** Pod **On-Demand** con `Container Image = ghcr.io/ericpr1/liberico-avatar:0.4`, GPU
     4090/5090, disco ≥60 GB, volumen en `/workspace`. Dentro (una vez por volumen):
     `bash /opt/avatar-service/scripts/download_models.sh /workspace/models`.
   - Build hecho con **podman** (sin Docker Desktop). Reconstruir: `podman build --platform linux/amd64 -t
     ghcr.io/ericpr1/liberico-avatar:0.4 -t ghcr.io/ericpr1/liberico-avatar:latest avatar-service/`; push:
     `podman push ghcr.io/ericpr1/liberico-avatar:0.4` (login:
     `gh auth token | podman login ghcr.io -u EricPR1 --password-stdin`).
6. ⏳ **V4 — reservas/reembolsos** en `supabase/functions/create-oral-b-session` (código, sin GPU): reservar al
   iniciar, confirmar el cargo solo al establecerse la sesión, reembolsar si falla / no hay capacidad + cap de
   concurrencia. ← siguiente tarea de código.
7. **Bucle conversacional en vivo** del `avatar-service` (§10):
   - ✅ **GATE M6 SUPERADO** (2026-06-04, RTX 5090): `scripts/bench_stream.py` replica el modo `stream` de
     `generate_video.py` y mide el coste por chunk. Resultado: **RTF≈0.19** — cada chunk de 960 ms de vídeo se
     genera en **~187 ms** (≈**128 FPS** efectivos a 512², vs 25 objetivo) → **el avatar en vivo es viable sin
     trucos**, con ~5× de margen (abre la puerta a SR en vivo y/o varias sesiones por GPU). El 1er chunk paga la
     compilación (de ahí el warmup en la preparación).
   - `avatar-service/soulx_stream.py` — wrapper de SoulX en **streaming** (init retrato + `push_audio`→frames),
     con la **ventana de audio ya validada** (deque deslizante `cached_audio_duration·sr` + índices fijos +
     descarte de `motion_frames_num` por chunk, idéntico a `generate_video.py`). `warmup()`/`reset()` listos.
   - ✅ **AVATAR CONVERSACIONAL EN VIVO — FUNCIONA Y APROBADO POR EL USUARIO** (2026-06-05, RTX 5090, probado en
     navegador): el alumno habla y el profesor (vídeo 1024² + voz) le **repregunta en español**. Stack: `bot.py`
     (LiveKit + Silero VAD vía `VADProcessor` stop_secs=1.2 + Whisper STT es + Claude Haiku + `KokoroTTSService`
     em_santa + `SoulXVideoProcessor`), `avatar_video.py` (publica la pista de vídeo — el transporte de Pipecat
     NO publica vídeo de salida), `soulx_processor.py` (generador en hilo + pacer 25fps que emite cada frame con
     sus 40ms de audio → **A/V sincronizado por timestamp WebRTC**), `demo/index.html`. Lecciones: SoulX en hilo
     (o congela VAD/STT); `cancel_on_idle_timeout=False`; saludo en `on_audio_track_subscribed` (no al entrar, o
     se corta el principio mientras el navegador pide permiso de micro); reiniciar con `kill -9` + esperar VRAM.
   - **Imagen `:0.5` en GHCR** = `:0.4` + deps en vivo (`pipecat-ai[silero] faster-whisper livekit livekit-api
     anthropic tenacity mediapipe>=0.10.18`) + código del bot baqueado → pod fresco arranca listo.
   - **1080p en vivo: NO viable en 1 GPU** (medido: Real-ESRGAN 128ms/frame, compacto 228ms/frame, vs ~32ms de
     presupuesto a 25fps). El avatar es 512² nativo; se publica a 1024² con **upscale cúbico cosmético** (sin
     detalle real). Para 1024² con detalle haría falta 2ª GPU dedicada a SR (≈2× coste).
   - **Conflicto de deps resuelto:** livekit/pipecat suben **protobuf a 6.x**, que rompe `mediapipe 0.10.9`
     (face-crop de SoulX). Fix: **`mediapipe>=0.10.18`** (importa con protobuf 6) **+ correr SoulX con
     `use_face_crop=False`** (la API `mediapipe.solutions` ya no existe en 0.10.35) → el retrato se **pre-recorta
     una vez offline** y el bot en vivo NO usa mediapipe. Dep set de `:0.5`: `pipecat-ai[silero] faster-whisper
     livekit livekit-api anthropic tenacity` + `mediapipe>=0.10.18`. `bot.py` hace `os.chdir(/opt/SoulX-FlashHead)`
     (flash_head abre rutas relativas).
   - ⏳ **Pendiente (turno conversacional, 3 bugs identificados, sin crash):** (a) el saludo
     (`on_first_participant_joined`→TTSSpeakFrame) no produjo audio/vídeo; (b) la voz del alumno no se transcribe
     (VAD→Whisper no entrega segmentos; el `vad_analyzer` en params del transporte está deprecado → cablear VAD
     bien); (c) `TTSSettings: model/voice/language NOT_GIVEN` (inicializar settings en KokoroTTSService, hay
     `set_voice()`). **Siguiente:** harness de audio sintético (publicar un wav a la room) para iterar el turno sin
     reconectar a mano; luego pacing/lip-sync A/V; luego dispatch+reservas e integración en LIBerico.
     **Empty room timeout de LiveKit = 300 s** (el bot solo en la room se desconecta a los 5 min).
   - `avatar-service/bot.py` — esqueleto del bot **Pipecat** (VAD→STT→Claude→Kokoro→SoulX→SFU) con la lógica IB
     ya definida. **Falta cablear** los servicios de `pipecat-ai` (pinnear versión) y el transporte del SFU.
   - `avatar-service/kokoro_tts.py` — ✅ helper de TTS español (`KokoroTTS`, voz `em_santa`) **desacoplado de
     Pipecat** y probable solo (`python kokoro_tts.py "texto" out.wav`): `synth`/`synth_chunks` (streaming) /
     `synth_16k` (para el encoder de SoulX) + `pcm16_bytes`. Falta el **wrapper Pipecat** `KokoroTTSService` que
     lo envuelva (depende de la versión pinneada de `pipecat-ai`).
   - `avatar-service/scripts/single_turn_demo.py` — ✅ **demo de UN turno (M5)** offline, ya cableado:
     `respuesta del alumno → Claude (examinador, Haiku) → Kokoro em_santa → SoulX 512² → CodeFormer 1024²`. Es el
     paso "ver que funciona" del contenido conversacional antes del bucle en vivo. **Validación pendiente en el
     pod** (necesita `ANTHROPIC_API_KEY` exportada por el usuario; no se versiona). El prompt del examinador es una
     paráfrasis genérica: el calibrado de producción está en `buildOralBSessionPrompt` (TS), no se duplica aquí.
   - Pendiente además: **clip "escuchando"** pre-renderizado (`assets/listening_loop.mp4`), y medir **SR en vivo**
     (GFPGAN/Real-ESRGAN vs 512²).

## 9. Decisiones / hechos clave (para no repetir errores)
- El repo necesita **Python 3.10** exacto (no 3.12).
- Usar **`python -m pip`** dentro del env (el `pip` suelto cae al python del sistema → error "externally-managed").
- Quitar el pin **`nvidia-nccl-cu12==2.27.3`** de requirements (conflicto con torch).
- **`huggingface_hub==0.35.3`** (no 1.x).
- Instalar entorno en **`/opt` (local)**, datos/salidas en **`/root`**; **NO** escribir en `/workspace` (cuota).
- **No** hace falta `flash_attn` ni `sageattention` (hay fallback SDPA). `sageattention==2.2.0` ni existe en PyPI.
- Aceptar **ToS de conda** + usar canal **conda-forge**.
- CodeFormer: parchear el **basicsr LOCAL del repo** (`/root/CodeFormer/basicsr/...`), no el de site-packages.
  En la imagen Docker se parchean **ambos** (`find / -path '*/basicsr/data/degradations.py' -exec sed ...`).
- CodeFormer para **vídeo** necesita el paquete pip **`ffmpeg-python`** (`import ffmpeg` en
  `basicsr/utils/video_util.py`) además del binario `ffmpeg`. Va baqueado desde `:0.4`. Sin él:
  `ModuleNotFoundError: No module named 'ffmpeg'` y no se genera la SR.
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
