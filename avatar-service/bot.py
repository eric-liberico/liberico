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
    EXAMINER_SYSTEM_PROMPT (= buildOralBSessionPrompt), FIRST_MESSAGE (= buildOralBFirstMessage)

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
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.audio.vad_processor import VADProcessor
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
STT_MODEL = os.environ.get("STT_MODEL", "small")

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
    vad = VADProcessor(vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=1.2)))
    stt = WhisperSTTService(model=STT_MODEL, device="cuda", language=Language.ES)
    llm = AnthropicLLMService(api_key=ANTHROPIC_API_KEY, model=LLM_MODEL)
    # El TTS publica la transcripción del examinador + el modo (fiable: capta el saludo y cada frase).
    tts = KokoroTTSService(voice="em_santa", on_event=publish_data)
    soulx = SoulXVideoProcessor(streamer, publisher)

    context = OpenAILLMContext(messages=[{"role": "system", "content": EXAMINER_SYSTEM_PROMPT}])
    aggregator = llm.create_context_aggregator(context)

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
        aggregator.user(),       # contexto + prompt IB de la fase
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

    greeted = {"done": False}

    @transport.event_handler("on_connected")
    async def _on_connected(_transport):  # noqa: ANN001
        await publisher.start()   # publica la pista de vídeo del avatar
        soulx.start_driver()      # bucle continuo: idle vivo (silencio) + lip-sync (audio TTS)

    # Saludar SOLO cuando el micro del alumno ya está activo (su pista de audio llega tras "permitir
    # micrófono"). Si saludamos al entrar, el navegador aún no reproduce audio y se pierde el principio.
    @transport.event_handler("on_audio_track_subscribed")
    async def _on_audio(_transport, participant):  # noqa: ANN001
        if greeted["done"]:
            return
        greeted["done"] = True
        await asyncio.sleep(0.4)  # margen para que el audio del navegador arranque del todo
        logger.info(f"[bot] micro del alumno activo ({participant}) → saludo")
        await task.queue_frame(TTSSpeakFrame(FIRST_MESSAGE))

    await PipelineRunner().run(task)


if __name__ == "__main__":
    asyncio.run(build_and_run())
