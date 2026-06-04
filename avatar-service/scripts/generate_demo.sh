#!/usr/bin/env bash
# Pipeline OFFLINE validado en la Fase 0: retrato + audio -> vídeo 512² (SoulX Lite) -> super-resolución 1024² (CodeFormer).
# Uso:
#   bash generate_demo.sh <retrato.jpg> <voz.wav> [/workspace/models/SoulX-FlashHead-1_3B] [/salida]
# Requiere la imagen Docker (deps ya instaladas) y el modelo descargado (download_models.sh).
set -e
IMG="${1:?retrato.jpg}"
WAV_IN="${2:?voz.wav}"
CKPT="${3:-/workspace/models/SoulX-FlashHead-1_3B}"
OUT="${4:-/workspace/out}"
mkdir -p "$OUT"

echo "[1/3] Resampleando audio a 16k mono (wav2vec espera 16k)..."
ffmpeg -y -i "$WAV_IN" -ac 1 -ar 16000 "$OUT/voz16k.wav" >/dev/null 2>&1

echo "[2/3] SoulX-FlashHead Lite (512²)..."
cd /opt/SoulX-FlashHead
python generate_video.py \
  --ckpt_dir "$CKPT" \
  --wav2vec_dir /opt/models/wav2vec2-base-960h \
  --model_type lite \
  --use_face_crop True \
  --cond_image "$IMG" \
  --audio_path "$OUT/voz16k.wav" \
  --audio_encode_mode stream \
  --save_file "$OUT/avatar_512.mp4"

echo "[3/3] CodeFormer super-resolución facial (-> 1024²)..."
cd /opt/CodeFormer
python inference_codeformer.py -w 0.8 --input_path "$OUT/avatar_512.mp4" \
  --face_upsample --bg_upsampler realesrgan --upscale 2 -o "$OUT/cf"
# remux: asegurar audio del 512 en el SR
ffmpeg -y -i "$OUT/cf/avatar_512.mp4" -i "$OUT/avatar_512.mp4" \
  -map 0:v -map 1:a? -c:v copy -c:a aac -shortest "$OUT/avatar_SR_1024.mp4" >/dev/null 2>&1 || true

echo "LISTO:"
echo "  512²: $OUT/avatar_512.mp4"
echo "  1024² (SR): $OUT/avatar_SR_1024.mp4"
