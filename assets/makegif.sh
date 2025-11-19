#!/bin/bash

# Verifica se o arquivo foi informado
if [ -z "$1" ]; then
    echo "Uso: ./makegif.sh \"arquivo.mp4\""
    exit 1
fi

INPUT="$1"
NAME="$(basename "$INPUT")"
NAME="${NAME%.*}"

echo "🎬 Convertendo vídeo para GIF bruto..."
ffmpeg -i "$INPUT" -vf "fps=15,scale=800:-1:flags=lanczos" "${NAME}-raw.gif"

echo "✨ Otimizando GIF..."
gifsicle -O3 --colors 256 "${NAME}-raw.gif" -o "${NAME}.gif"

echo "🧹 Limpando GIF temporário..."
rm "${NAME}-raw.gif"

echo "✅ GIF final criado: ${NAME}.gif"
