"""bot.py — Bot conversacional del avatar (avatar-service), corre en el worker GPU.

Bucle en vivo del Oral de Spanish B (Pipecat 0.0.108):
    LiveKit room ⇄ [Silero VAD] → [Whisper STT es] → [Claude LLM (prompts IB)] → [Kokoro TTS em_santa]
                                                                              → [SoulX streaming] → vídeo

Se une a una room de LiveKit, recibe el audio del alumno y publica audio+vídeo del avatar (512²).
Warm-up de SoulX (~1er chunk) al arrancar, oculto por la preparación del alumno.

Config por entorno (la inyecta create-oral-b-session vía dispatch, o se pone a mano en el demo):
    LIVEKIT_URL, LIVEKIT_TOKEN, LIVEKIT_ROOM
    ANTHROPIC_API_KEY
    SOULX_CKPT_DIR (def /workspace/models/SoulX-FlashHead-1_3B), WAV2VEC_DIR, COND_IMAGE (retrato)
    EXAMINER_SYSTEM_PROMPT (= buildOralBFullPrompt, prompt único de todo el oral), FIRST_MESSAGE (saludo)

Decisión de arquitectura (validada): el bot corre SoulX con use_face_crop=False (el retrato se pre-recorta
una vez, offline) para NO depender de mediapipe en vivo (su API `solutions` choca con el protobuf que exigen
livekit/pipecat). Ver docs/avatar-soulx-spike.md.
"""
from __future__ import annotations

import asyncio
import json
import os

# flash_head (SoulX) abre rutas RELATIVAS a la raíz de su repo al importarse → fijar el cwd antes de
# importar soulx_stream/soulx_processor, para que el bot arranque sea cual sea el directorio de lanzamiento.
os.chdir(os.environ.get("SOULX_REPO", "/opt/SoulX-FlashHead"))

import cv2
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext, OpenAILLMContextFrame
from pipecat.processors.audio.vad_processor import VADProcessor
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.transcript_processor import TranscriptProcessor
from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.whisper.stt import WhisperSTTService
from pipecat.transcriptions.language import Language
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from avatar_video import AvatarVideoPublisher
from kokoro_service import KokoroTTSService
from soulx_processor import SoulXVideoProcessor
from soulx_stream import SoulXStreamer

# ── Config ────────────────────────────────────────────────────────────────────
LIVEKIT_URL = os.environ["LIVEKIT_URL"]
LIVEKIT_TOKEN = os.environ["LIVEKIT_TOKEN"]
LIVEKIT_ROOM = os.environ["LIVEKIT_ROOM"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CKPT_DIR = os.environ.get("SOULX_CKPT_DIR", "/workspace/models/SoulX-FlashHead-1_3B")
WAV2VEC_DIR = os.environ.get("WAV2VEC_DIR", "/opt/models/wav2vec2-base-960h")
COND_IMAGE = os.environ.get("COND_IMAGE", "/root/profesor.jpg")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-haiku-4-5")
# STT del bot. Se usa también como VERBATIM del Criterio A (lengua), crítico con NO nativos → "large-v3"
# (fiel a los errores reales). Coste: ~1-1,5 s/turno de latencia. La forma de tener calidad Y rapidez es
# DESACOPLAR: modelo rápido en vivo + pase large-v3 para el verbatim (pendiente). Configurable por env.
STT_MODEL = os.environ.get("STT_MODEL", "large-v3")

EXAMINER_SYSTEM_PROMPT = os.environ.get(
    "EXAMINER_SYSTEM_PROMPT",
    "Eres un examinador de IB Spanish B en el oral individual. Hablas siempre español, con tono cálido, "
    "cercano y profesional. Escuchas al alumno y respondes con UNA sola pregunta de seguimiento, abierta y "
    "breve (máx. 2 frases). No corriges sus errores ni evalúas en voz alta. "
    "IMPORTANTE: tu respuesta se lee en voz alta por un sintetizador, así que escribe SOLO texto plano hablado: "
    "nada de markdown, asteriscos, guiones de lista, emojis ni símbolos. Si haces una pregunta, termínala con "
    "signos de interrogación '¿...?' para que suene como pregunta.",
)
FIRST_MESSAGE = os.environ.get(
    "FIRST_MESSAGE", "Hola, bienvenido a tu oral de español. Cuando estés listo, empezamos."
)

# Bot único consciente de fase: UN solo system prompt (EXAMINER_SYSTEM_PROMPT = prompt completo del oral).
# El cambio de parte NO toca el system (Anthropic lo exige como parámetro aparte; mutarlo en caliente rompía
# y daba 400). En su lugar inyectamos una INSTRUCCIÓN DE CONTROL en la conversación y disparamos al LLM.
PHASE_INSTR = {
    2: "[CONTROL DEL SISTEMA] El alumno ha terminado su presentación. Pasa a la PARTE 2 (discusión del "
       "estímulo): di una transición muy breve y hazle tu PRIMERA pregunta abierta sobre algo concreto que "
       "haya presentado. UNA sola pregunta, en texto plano hablado, sin viñetas ni feedback.",
    3: "[CONTROL DEL SISTEMA] Pasa a la PARTE 3 (discusión general): di una transición muy breve y haz tu "
       "primera pregunta abierta más amplia sobre el tema, más allá del estímulo. UNA sola pregunta, en texto "
       "plano hablado, sin viñetas ni feedback.",
}


class PhaseGate(FrameProcessor):
    """Control de turno por PARTE. En la Parte 1 (monólogo) el turno del alumno SÍ se guarda en el contexto
    del LLM (memoria continua → en la Parte 2 el examinador recuerda lo presentado) pero NO se genera respuesta
    (se descarta el frame que dispara al LLM) → el avatar no interrumpe. En Partes 2/3 deja pasar (turnos).
    Va DESPUÉS de aggregator.user() (que ya añadió el turno al contexto) y ANTES del LLM."""

    def __init__(self, phase: dict) -> None:
        super().__init__()
        self._phase = phase

    async def process_frame(self, frame, direction: FrameDirection) -> None:  # noqa: ANN001
        await super().process_frame(frame, direction)
        if self._phase["n"] == 1 and isinstance(frame, OpenAILLMContextFrame):
            return  # Parte 1: contexto sí, respuesta no
        await self.push_frame(frame, direction)


async def build_and_run() -> None:
    # 1) Avatar (carga pesos + warm-up; use_face_crop=False → sin mediapipe en vivo)
    streamer = SoulXStreamer(
        ckpt_dir=CKPT_DIR, wav2vec_dir=WAV2VEC_DIR, cond_image=COND_IMAGE,
        model_type="lite", use_face_crop=False,
    )
    streamer.warmup()

    # 2) Transporte LiveKit (solo entrada audio del alumno + salida de audio; el vídeo del avatar lo
    #    publicamos aparte porque el transporte de Pipecat no implementa salida de vídeo por LiveKit).
    transport = LiveKitTransport(
        url=LIVEKIT_URL,
        token=LIVEKIT_TOKEN,
        room_name=LIVEKIT_ROOM,
        params=LiveKitParams(audio_in_enabled=True, audio_out_enabled=True),
    )

    # Publicador de vídeo del avatar (VideoSource propia) + frame idle = retrato (profesor siempre visible).
    idle = cv2.cvtColor(cv2.resize(cv2.imread(COND_IMAGE), (512, 512)), cv2.COLOR_BGR2RGB)
    # Pista a 1024² (upscale cúbico cosmético desde los 512² nativos de SoulX; SR real no cabe en vivo).
    publisher = AvatarVideoPublisher(
        get_room=lambda: transport._client.room, width=1024, height=1024, idle_frame=idle,
    )

    # Datachannel → UI de LIBerico: transcripciones (alumno/examinador) + estado (hablando/escuchando).
    async def publish_data(obj: dict) -> None:
        try:
            await transport._client.room.local_participant.publish_data(
                json.dumps(obj, ensure_ascii=False).encode("utf-8"), reliable=True
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[data] no se pudo publicar {obj.get('type')}: {exc}")

    # 3) Servicios
    # VAD como VADProcessor antes del STT (el vad_analyzer del transporte está deprecado y no segmentaba).
    # stop_secs alto: esperar ~1.2 s de silencio antes de dar el turno por terminado (no interrumpir al alumno).
    # stop_secs alto en las preguntas: esperar ~1.2 s de silencio antes de dar el turno por terminado para NO
    # interrumpir al alumno a media respuesta (en la Parte 1 da igual: el bot no responde).
    vad = VADProcessor(vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=1.2)))
    stt = WhisperSTTService(model=STT_MODEL, device="cuda", language=Language.ES)
    llm = AnthropicLLMService(api_key=ANTHROPIC_API_KEY, model=LLM_MODEL)
    # El TTS publica la transcripción del examinador + el modo (fiable: capta el saludo y cada frase).
    tts = KokoroTTSService(voice="em_santa", on_event=publish_data)
    soulx = SoulXVideoProcessor(streamer, publisher)

    phase = {"n": 1}  # parte actual del oral (1 monólogo · 2/3 preguntas); la cambia el datachannel
    context = OpenAILLMContext(messages=[{"role": "system", "content": EXAMINER_SYSTEM_PROMPT}])
    aggregator = llm.create_context_aggregator(context)
    gate = PhaseGate(phase)

    # La transcripción del ALUMNO se publica con TranscriptProcessor.user() (inmediata tras el STT).
    transcript = TranscriptProcessor()

    @transcript.event_handler("on_transcript_update")
    async def _on_transcript(_proc, frame):  # noqa: ANN001
        for m in frame.messages:
            text = (getattr(m, "content", "") or "").strip()
            if text and getattr(m, "role", "") == "user":
                await publish_data({"type": "transcript", "source": "user", "text": text})

    pipeline = Pipeline([
        transport.input(),       # audio del alumno
        vad,                     # → segmenta el habla (VADUserStarted/Stopped)
        stt,                     # → texto
        transcript.user(),       # → publica la transcripción del alumno por datachannel
        aggregator.user(),       # añade el turno del alumno al contexto (memoria continua entre partes)
        gate,                    # Parte 1: traga el disparo del LLM (sin respuesta) · Partes 2/3: pasa
        llm,                     # → pregunta del examinador
        tts,                     # → audio + transcripción/modo del examinador (datachannel)
        soulx,                   # → vídeo del avatar (+ audio passthrough)
        transport.output(),      # publica A/V en la room
        aggregator.assistant(),  # registra la respuesta del examinador
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(allow_interruptions=True, enable_metrics=True),
        # El bot puede estar esperando a que el alumno hable; no cancelar por inactividad.
        cancel_on_idle_timeout=False,
    )

    greeted = {"done": False}  # el ORAL ha empezado (micro del alumno activo)
    joined = {"done": False}   # hay un alumno en la sala (puede estar calentando en preparación)
    hard = {"task": None}      # timer del corte de 15 min; arranca al EMPEZAR el oral, no al conectar

    JOIN_TIMEOUT = int(os.environ.get("JOIN_TIMEOUT_SECS", "150"))        # sala vacía → fin (no quemar GPU)
    MAX_WARM_WAIT = int(os.environ.get("MAX_WARM_WAIT_SECS", "480"))      # caliente sin empezar el oral → fin (8 min)
    max_secs = int(os.environ.get("MAX_SESSION_SECS", "900"))            # corte DURO del oral (15 min IB)

    terminando = {"done": False}

    def _force_exit_soon(grace: float = 3.0) -> None:
        # GARANTÍA dura e independiente del event loop / del hilo de SoulX: un hilo aparte mata el proceso
        # pase lo que pase. Clave: `await task.cancel()` PUEDE COLGARSE (el pipeline/hilo de SoulX no
        # devuelve) → si el os._exit fuese DESPUÉS del cancel, el bot quedaría zombi quemando GPU hasta el
        # timeout de Modal. Este hilo fuerza la salida aunque el cancel no vuelva nunca.
        import threading
        import time as _time

        def _kill() -> None:
            _time.sleep(grace)
            logger.info("[bot] forzando salida del proceso (GPU liberada)")
            os._exit(0)

        threading.Thread(target=_kill, daemon=True).start()

    # ÚNICO camino de fin. Programa la salida dura del proceso y luego intenta un cierre limpio del pipeline.
    # Imprescindible en TODOS los finales (desconexión, sala vacía, AFK, corte 15 min). Idempotente.
    async def _terminar(motivo: str):
        if terminando["done"]:
            return
        terminando["done"] = True
        logger.info(f"[bot] fin de sesión: {motivo} → liberando GPU en ~{3}s")
        _force_exit_soon(3.0)  # mata el proceso aunque task.cancel() se cuelgue
        try:
            await task.cancel()  # intento de cierre limpio; si tarda, el hilo de arriba fuerza la salida
        except Exception:  # noqa: BLE001
            pass

    async def _hard_stop():
        await asyncio.sleep(max_secs)
        await _terminar(f"límite de {max_secs}s (corte duro del oral)")

    @transport.event_handler("on_connected")
    async def _on_connected(_transport):  # noqa: ANN001
        await publisher.start()  # publica la pista de vídeo del avatar (retrato idle; aún sin generar)

        # ¿el alumno ya está en la sala? Suele conectarse en la PREPARACIÓN, mientras el bot calienta.
        try:
            if transport._client.room.remote_participants:
                joined["done"] = True
        except Exception:  # noqa: BLE001
            pass

        # Guard de sala vacía: si NADIE entra en JOIN_TIMEOUT, cerrar (no quemar GPU en vacío).
        async def _empty_guard():
            await asyncio.sleep(JOIN_TIMEOUT)
            if not joined["done"]:
                await _terminar(f"nadie entró en {JOIN_TIMEOUT}s (sala vacía)")

        # Guard de espera: bot caliente pero el oral no arranca (prep muy larga / alumno AFK) → cerrar.
        async def _warm_guard():
            await asyncio.sleep(MAX_WARM_WAIT)
            if not greeted["done"]:
                await _terminar(f"el oral no empezó en {MAX_WARM_WAIT}s (alumno AFK)")

        asyncio.create_task(_empty_guard())
        asyncio.create_task(_warm_guard())

        # ── Cambio de PARTE por datachannel (el frontend manda {type:"phase", fase:2|3}) ──
        # Mismo bot toda la sesión: al pasar de parte cambiamos el system prompt (manteniendo el contexto de
        # la conversación) y el examinador dice la transición y empieza a preguntar. La Parte 1 (gate cerrado)
        # se abre sola al pasar a 2.
        loop = asyncio.get_running_loop()

        def _apply_phase(f: int) -> None:  # corre en el hilo del event loop
            if f not in (2, 3) or f == phase["n"]:
                return
            phase["n"] = f
            logger.info(f"[bot] cambio a la Parte {f}")
            # Inyecta la instrucción de control (NO toca el system) y dispara al LLM → transición + 1ª pregunta.
            context.add_message({"role": "user", "content": PHASE_INSTR[f]})
            asyncio.create_task(task.queue_frame(OpenAILLMContextFrame(context)))

        def _on_data(*args) -> None:  # noqa: ANN002  (callback de livekit; firma variable según versión)
            raw = None
            for a in args:
                d = getattr(a, "data", None)
                if d is not None:
                    raw = d
                    break
                if isinstance(a, (bytes, bytearray)):
                    raw = a
                    break
            if raw is None:
                return
            try:
                obj = json.loads(bytes(raw).decode("utf-8"))
            except Exception:  # noqa: BLE001
                return
            if obj.get("type") == "phase":
                try:
                    loop.call_soon_threadsafe(_apply_phase, int(obj.get("fase", 0)))
                except Exception:  # noqa: BLE001
                    pass

        try:
            transport._client.room.on("data_received", _on_data)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[bot] no se pudo suscribir a data_received: {exc}")

    # Backup de presencia (por si el alumno entra DESPUÉS de que el bot conecte).
    @transport.event_handler("on_first_participant_joined")
    async def _on_join(_transport, participant):  # noqa: ANN001
        joined["done"] = True
        logger.info(f"[bot] alumno presente ({participant}); calentando, a la espera del inicio del oral")

    # El oral EMPIEZA cuando el alumno activa el micro (botón "comenzar"). Ahí, y NO en la conexión: saludo,
    # generación SoulX y arranque del corte duro de 15 min (así el warm-up en preparación no consume el oral).
    @transport.event_handler("on_audio_track_subscribed")
    async def _on_audio(_transport, participant):  # noqa: ANN001
        if greeted["done"]:
            return
        greeted["done"] = True
        soulx.start_driver()                            # ahora sí: idle vivo + lip-sync
        hard["task"] = asyncio.create_task(_hard_stop())  # el corte de 15 min cuenta desde aquí
        await asyncio.sleep(0.4)  # margen para que el audio del navegador arranque del todo
        logger.info(f"[bot] micro del alumno activo ({participant}) → saludo + inicio del oral (Parte 1)")
        await task.queue_frame(TTSSpeakFrame(FIRST_MESSAGE))

    # El alumno sale (cierra la pestaña o pulsa "Parar" → se desconecta) → terminar la sesión enseguida.
    @transport.event_handler("on_participant_disconnected")
    async def _on_left(_transport, participant):  # noqa: ANN001
        await _terminar(f"alumno se desconectó ({participant})")

    try:
        await PipelineRunner().run(task)
    finally:
        if hard["task"]:
            hard["task"].cancel()


if __name__ == "__main__":
    asyncio.run(build_and_run())
