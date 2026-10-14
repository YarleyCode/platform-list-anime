#!/bin/bash

export PATH="$HOME/.local/share/pnpm/bin:$PATH"

cd /home/yarley/Escritorio/yarley/programing/project/alist

echo "Iniciando servidor de desarrollo..."
pnpm dev &
SERVER_PID=$!

echo "Esperando a que el servidor esté listo..."
sleep 5

echo "Abriendo navegador..."
xdg-open http://localhost:3000 2>/dev/null &

echo ""
echo "========================================="
echo "  Servidor corriendo en http://localhost:3000"
echo "  Presiona Ctrl+C para detener"
echo "========================================="
echo ""

wait $SERVER_PID