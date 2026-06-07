#!/usr/bin/env bash
# Descarga el modelo grande de SoulX (13 GB) al directorio destino (volumen persistente).
# La imagen Docker NO lo baquea para no pesar 25 GB. Ejecuta esto una vez por volumen.
#   bash download_models.sh [/workspace/models]
set -e
DEST="${1:-/workspace/models}"
mkdir -p "$DEST"
echo "Descargando SoulX-FlashHead-1_3B (~13 GB) a $DEST ..."
python -c "from huggingface_hub import snapshot_download; \
snapshot_download('Soul-AILab/SoulX-FlashHead-1_3B', local_dir='$DEST/SoulX-FlashHead-1_3B')"
echo "OK -> $DEST/SoulX-FlashHead-1_3B"
