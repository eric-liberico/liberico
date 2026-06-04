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
import os

# flash_head (SoulX) abre rutas RELATIVAS a la raíz de su repo al importarse → fijar el cwd antes de
# importar soulx_stream/soulx_processor, para que el bot arranque sea cual sea el directorio de lanzamiento.
os.chdir(os.environ.get("SOULX_REPO", "/opt/SoulX-FlashHead"))

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.whisper.stt import WhisperSTTService
from pipecat.transcriptions.language import Language
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

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
    "Eres un examinador de IB Spanish B en el oral individual. Hablas siempre español, cálido y "
    "profesional. Escuchas al alumno y respondes con UNA sola pregunta de seguimiento, abierta y breve "
    "(máx. 2 frases). No corriges sus errores ni evalúas en voz alta.",
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

    # 2) Transporte LiveKit (entrada audio del alumno + salida audio/vídeo del avatar)
    transport = LiveKitTransport(
        url=LIVEKIT_URL,
        token=LIVEKIT_TOKEN,
        room_name=LIVEKIT_ROOM,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            video_out_enabled=True,
            video_out_is_live=True,
            video_out_width=512,
            video_out_height=512,
            video_out_framerate=streamer.tgt_fps,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    # 3) Servicios
    stt = WhisperSTTService(model=STT_MODEL, device="cuda", language=Language.ES)
    llm = AnthropicLLMService(api_key=ANTHROPIC_API_KEY, model=LLM_MODEL)
    tts = KokoroTTSService(voice="em_santa")
    soulx = SoulXVideoProcessor(streamer)

    context = OpenAILLMContext(messages=[{"role": "system", "content": EXAMINER_SYSTEM_PROMPT}])
    aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline([
        transport.input(),       # audio del alumno
        stt,                     # → texto
        aggregator.user(),       # contexto + prompt IB de la fase
        llm,                     # → pregunta del examinador
        tts,                     # → audio (Kokoro em_santa)
        soulx,                   # → vídeo del avatar (+ audio passthrough)
        transport.output(),      # publica A/V en la room
        aggregator.assistant(),  # registra la respuesta del examinador
    ])

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True, enable_metrics=True))

    @transport.event_handler("on_first_participant_joined")
    async def _on_join(_transport, _participant):  # noqa: ANN001
        await task.queue_frame(TTSSpeakFrame(FIRST_MESSAGE))

    await PipelineRunner().run(task)


if __name__ == "__main__":
    asyncio.run(build_and_run())
