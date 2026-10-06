#!/usr/bin/env bash
# Starts the full dev environment: Postgres/Redis, backend, frontend. Ctrl+C stops backend and frontend; containers keep running.
# --lan exposes the frontend on 0.0.0.0 and prints a URL to open from a phone on the same network.
set -euo pipefail

LAN=false
for arg in "$@"; do
  case "$arg" in
    --lan) LAN=true ;;
    *) echo "Uso: $0 [--lan]" >&2; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.dev-logs"
BACKEND_LOG="$LOG_DIR/backend.log"

mkdir -p "$LOG_DIR"

if [ "$LAN" = true ]; then
  DEFAULT_IFACE="$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')"
  LAN_IP="$(ipconfig getifaddr "${DEFAULT_IFACE:-en0}" 2>/dev/null || true)"
  if [ -z "$LAN_IP" ]; then
    echo "!! No pude detectar la IP de la red local. Conéctate a una red Wi-Fi e intenta de nuevo." >&2
    exit 1
  fi
  LAN_ORIGIN="http://$LAN_IP:5173"
fi

echo "==> Levantando Postgres y Redis..."
docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d postgres redis

echo "==> Esperando a que Postgres acepte conexiones..."
until docker exec salazar-cevicheria-postgres-1 pg_isready -U salazar -d salazar_dev > /dev/null 2>&1; do
  sleep 1
done

if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

CURRENT_SECRET="$(grep '^APP_JWT_SECRET=' "$BACKEND_DIR/.env" | cut -d'=' -f2-)"
if [ -z "$CURRENT_SECRET" ]; then
  echo "==> Generando APP_JWT_SECRET en backend/.env (primera vez)..."
  SECRET="$(openssl rand -hex 32)"
  sed -i '' "s|^APP_JWT_SECRET=.*|APP_JWT_SECRET=$SECRET|" "$BACKEND_DIR/.env"
fi

echo "==> Iniciando el backend (log: $BACKEND_LOG)..."
(
  cd "$BACKEND_DIR"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  if [ "$LAN" = true ]; then
    export APP_CORS_ALLOWED_ORIGINS="${APP_CORS_ALLOWED_ORIGINS:+$APP_CORS_ALLOWED_ORIGINS,}$LAN_ORIGIN"
    export APP_FRONTEND_URL="$LAN_ORIGIN"
  fi
  exec ./mvnw spring-boot:run
) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

cleanup() {
  echo
  echo "==> Deteniendo el backend..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo "==> Deteniendo Postgres y Redis..."
  docker compose -f "$ROOT_DIR/docker-compose.dev.yml" stop postgres redis 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Esperando a que el backend responda en :8080 (puede tardar ~30s)..."
ATTEMPTS=0
until curl -s -o /dev/null http://localhost:8080/swagger-ui/index.html; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 60 ]; then
    echo "!! El backend no respondió a tiempo. Últimas líneas del log:"
    tail -n 40 "$BACKEND_LOG"
    exit 1
  fi
  sleep 2
done
echo "==> Backend listo. Logs en vivo: tail -f $BACKEND_LOG"

cd "$FRONTEND_DIR"

if [ "$LAN" = true ]; then
  echo
  echo "==> Abre esto en tu celular (misma red Wi-Fi):"
  echo
  echo "    $LAN_ORIGIN"
  echo
  echo "==> Iniciando el frontend en 0.0.0.0 (pnpm dev --host)..."
  VITE_API_URL="http://$LAN_IP:8080/api" pnpm dev --host 0.0.0.0
else
  ( sleep 3 && open "http://localhost:5173/" ) &
  echo "==> Iniciando el frontend (pnpm dev)..."
  pnpm dev
fi
