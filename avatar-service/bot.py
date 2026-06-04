"""
bot.py — Bot conversacional del avatar (avatar-service), corre en el worker GPU.

Bucle en vivo del Oral de Spanish B:
    SFU room  ⇄  [Silero VAD] → [faster-whisper STT] → [Claude LLM (prompts IB)] → [Kokoro TTS]
                                                                                      → [SoulX streaming] → vídeo

Se une a una "room" del SFU (LiveKit/Daily), recibe el audio del alumno, y publica el audio+vídeo del avatar.
El warm-up (cargar SoulX/TTS/STT en VRAM, ~90 s) se hace al crear el worker, oculto por la preparación del alumno.

⚠️ ESTADO: ESQUELETO. La lógica específica de LIBerico (fases IB, prompts, integración SoulX) está concreta;
las llamadas exactas de Pipecat dependen de la versión → PINNEAR `pipecat-ai` y confirmar imports/clases.
La pieza propia clave es `SoulXVideoProcessor` (convierte audio TTS → frames de vídeo con `soulx_stream`).
Probar en GPU. Referencia de streaming SoulX: `gradio_app_streaming.py` del repo.
"""

from __future__ import annotations

import asyncio
import os

import numpy as np

from soulx_stream import SoulXStreamer

# ── Config (de entorno) ───────────────────────────────────────────────────────
CKPT_DIR = os.environ["SOULX_CKPT_DIR"]            # /workspace/models/SoulX-FlashHead-1_3B
WAV2VEC_DIR = os.environ.get("WAV2VEC_DIR", "/opt/models/wav2vec2-base-960h")
COND_IMAGE = os.environ["COND_IMAGE"]             # retrato del profesor (subido al iniciar la sesión)
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
SFU_URL = os.environ["SFU_URL"]                    # room del SFU (LiveKit/Daily)
SFU_TOKEN = os.environ["SFU_TOKEN"]               # token del worker para la room
# El prompt del examinador y la fase los inyecta create-oral-b-session como metadato de la room:
EXAMINER_SYSTEM_PROMPT = os.environ["EXAMINER_SYSTEM_PROMPT"]  # = buildOralBSessionPrompt(...) de LIBerico
FIRST_MESSAGE = os.environ.get("FIRST_MESSAGE", "")           # = buildOralBFirstMessage(...)


# ── Procesador de vídeo del avatar (pieza propia) ─────────────────────────────
# Consume el audio que produce el TTS y emite frames de vídeo del avatar, sincronizados con ese audio.
# En Pipecat se implementa como un FrameProcessor que:
#   - recibe TTSAudioRawFrame (PCM del TTS, resampleado a 16k) → SoulXStreamer.push_audio() → frames
#   - emite OutputImageRawFrame por cada frame y deja pasar el audio (para que el SFU publique A/V sincronizados)
class SoulXVideoProcessor:
    """Pseudo-implementación; adaptar a la clase base FrameProcessor de la versión de pipecat usada."""

    def __init__(self, streamer: SoulXStreamer):
        self.streamer = streamer

    async def on_tts_audio(self, pcm_16k: np.ndarray, emit_video, emit_audio):
        # 1) reenviar el audio del TTS al SFU
        await emit_audio(pcm_16k)
        # 2) generar y emitir frames de vídeo a medida que el wrapper los produce
        for frame in self.streamer.push_audio(pcm_16k):   # frame: np.uint8 [H, W, 3]
            await emit_video(frame, fps=self.streamer.tgt_fps)

    async def on_turn_end(self, emit_video):
        for frame in self.streamer.flush():
            await emit_video(frame, fps=self.streamer.tgt_fps)
    # Mientras el alumno habla (no hay audio TTS) → el transporte muestra un bucle "escuchando"
    # pre-renderizado (no se gasta GPU generando). Ver IDLE_LOOP_MP4 abajo.


IDLE_LOOP_MP4 = os.environ.get("IDLE_LOOP_MP4", "/opt/avatar-service/assets/listening_loop.mp4")


async def build_and_run() -> None:
    """
    Estructura del pipeline (adaptar a la API de la versión pinneada de pipecat-ai):

      transport = LiveKitTransport(url=SFU_URL, token=SFU_TOKEN, params=...VAD(Silero)...)
      stt  = WhisperSTTService(model="...", device="cuda")          # faster-whisper, es
      llm  = AnthropicLLMService(api_key=ANTHROPIC_API_KEY, model="claude-haiku-4-5")
      tts  = KokoroTTSService(voice="em_santa", sample_rate=16000)  # wrapper Pipecat sobre kokoro_tts.KokoroTTS
      soulx = SoulXVideoProcessor(streamer)

      pipeline = Pipeline([
          transport.input(),         # audio del alumno
          stt,                       # → texto (transcripción limpia; se acumula por fase)
          context_aggregator.user(), # contexto con EXAMINER_SYSTEM_PROMPT (prompt IB de la fase)
          llm,                       # → pregunta del examinador
          tts,                       # → audio (Kokoro em_santa)
          soulx,                     # → vídeo del avatar (+ audio passthrough)
          transport.output(),        # publica A/V en la room
      ])

      # primer mensaje del examinador (saludo de la fase)
      if FIRST_MESSAGE: await task.queue_frame(TTSSpeakFrame(FIRST_MESSAGE))
      await runner.run(task)

    Notas de integración con LIBerico:
      - La FASE (1/2/3) y su prompt llegan como metadato de la room (los pone create-oral-b-session).
        Al cambiar de fase, el frontend recrea/actualiza el contexto del LLM con el nuevo prompt.
      - Las transcripciones (user/assistant + parte) se envían por datachannel al navegador para pintarlas
        y para construir la transcripción limpia por partes que consumirá evaluate-oral-b.
      - Al terminar la sesión: el worker hace scale-to-zero; el audio crudo del alumno se sube a `audio-oral`
        para la transcripción verbatim (Criterio A) y luego evaluate-oral-b da la nota /30.
    """
    streamer = SoulXStreamer(ckpt_dir=CKPT_DIR, wav2vec_dir=WAV2VEC_DIR, cond_image=COND_IMAGE, model_type="lite")
    streamer.warmup()  # ~90 s, en el arranque del worker (durante la preparación del alumno)
    _ = SoulXVideoProcessor(streamer)
    # TODO: cablear los servicios de pipecat (ver docstring) y `await runner.run(task)`.
    raise NotImplementedError(
        "Esqueleto: cablear pipecat-ai (VAD/STT/LLM/TTS/transport) según la versión pinneada. "
        "La integración SoulX (SoulXStreamer/SoulXVideoProcessor) y la lógica IB ya están definidas."
    )


if __name__ == "__main__":
    asyncio.run(build_and_run())
