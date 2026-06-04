#!/usr/bin/env python3
"""Demo de UN TURNO del oral conversacional (milestone M5), OFFLINE, en el pod GPU.

Encadena la lógica conversacional completa, sin Pipecat ni SFU (eso es M6):

    respuesta del alumno (texto) → Claude (examinador IB) → Kokoro em_santa (TTS)
                                 → SoulX-FlashHead Lite (512²) → CodeFormer (SR 1024²)

Sirve para "VER QUE FUNCIONA": producir un vídeo del avatar formulando la siguiente
pregunta del examinador a partir de lo que dijo el alumno. Es el paso natural antes del
bucle en vivo (bot.py).

Uso (dentro del pod, con la imagen :0.4 y el modelo descargado):
    export ANTHROPIC_API_KEY=...           # secreto, NUNCA en el repo
    python scripts/single_turn_demo.py \
        --image /root/profesor.jpg \
        --answer "Pues yo creo que la imagen muestra una familia comiendo, eh, juntos." \
        --fase 2 --nivel SL

Salida: /workspace/out/avatar_512.mp4 y /workspace/out/avatar_SR_1024.mp4 (vía generate_demo.sh).

Notas:
  - El prompt del examinador aquí es una PARÁFRASIS breve y genérica (no copia descriptores
    oficiales del IB). El prompt calibrado de producción vive en TS
    (`supabase/functions/_shared/prompts/spanish-b-language.ts: buildOralBSessionPrompt`);
    este demo no lo duplica a propósito.
  - LLM en Haiku (barato), coherente con el plano de costes del plan.
  - No añade dependencias pip: la llamada a Claude usa urllib (stdlib).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

# kokoro_tts.py vive en el directorio padre (avatar-service/)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from kokoro_tts import KOKORO_SR, KokoroTTS  # noqa: E402

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
LLM_MODEL = "claude-haiku-4-5"

# Paráfrasis genérica del rol — NO son descriptores oficiales del IB.
EXAMINER_SYSTEM = (
    "Eres un examinador de IB Spanish B realizando el oral individual. Hablas siempre en español, "
    "con un tono cálido y profesional. Tu trabajo es mantener una conversación natural: escuchas la "
    "intervención del alumno y respondes con UNA sola pregunta de seguimiento, abierta y concreta, "
    "que le invite a desarrollar más ideas (opiniones, ejemplos, comparaciones con su cultura). "
    "No corrijas sus errores ni evalúes en voz alta. No hagas listas. Máximo 2 frases."
)

FASE_FOCO = {
    1: "Estáis empezando: el alumno acaba de presentar el estímulo. Pídele que profundice en lo que describió.",
    2: "Discusión sobre el estímulo (imagen o pasaje): conéctalo con el área temática y su experiencia.",
    3: "Discusión general: amplía hacia temas más amplios relacionados, más allá del estímulo concreto.",
}


def examiner_reply(answer: str, fase: int, nivel: str, api_key: str) -> str:
    """Llama a Claude (Haiku) y devuelve la siguiente pregunta del examinador."""
    system = EXAMINER_SYSTEM + " " + FASE_FOCO.get(fase, "")
    payload = {
        "model": LLM_MODEL,
        "max_tokens": 200,
        "system": system,
        "messages": [
            {"role": "user", "content": f"(Nivel {nivel}) El alumno acaba de decir: «{answer}»"}
        ],
    }
    req = urllib.request.Request(
        ANTHROPIC_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    text = "".join(parts).strip()
    if not text:
        raise RuntimeError(f"Respuesta vacía de Claude: {data}")
    return text


def main() -> int:
    ap = argparse.ArgumentParser(description="Demo de un turno del oral conversacional (M5).")
    ap.add_argument("--image", required=True, help="retrato del profesor (jpg)")
    ap.add_argument("--answer", required=True, help="lo que dijo el alumno (texto)")
    ap.add_argument("--fase", type=int, default=2, choices=[1, 2, 3])
    ap.add_argument("--nivel", default="SL", choices=["SL", "HL"])
    ap.add_argument("--out", default="/workspace/out")
    ap.add_argument("--ckpt", default="/workspace/models/SoulX-FlashHead-1_3B")
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: define ANTHROPIC_API_KEY en el entorno (no se versiona).", file=sys.stderr)
        return 2

    print("[1/3] Claude (examinador) genera la siguiente pregunta…")
    pregunta = examiner_reply(args.answer, args.fase, args.nivel, api_key)
    print(f"  Examinador: {pregunta}")

    print("[2/3] Kokoro em_santa sintetiza la voz…")
    import soundfile as sf

    audio = KokoroTTS().synth(pregunta)
    wav_path = Path(tempfile.gettempdir()) / "examiner_turn.wav"
    sf.write(str(wav_path), audio, KOKORO_SR)
    print(f"  voz: {wav_path} ({audio.size / KOKORO_SR:.1f}s)")

    print("[3/3] SoulX (512²) + CodeFormer (SR 1024²) vía generate_demo.sh…")
    demo = Path(__file__).resolve().parent / "generate_demo.sh"
    subprocess.run(
        ["bash", str(demo), args.image, str(wav_path), args.ckpt, args.out],
        check=True,
    )
    print(f"LISTO → {args.out}/avatar_SR_1024.mp4")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
