#!/usr/bin/env bash
# Levanta el entorno de desarrollo completo: Postgres + Redis (docker-compose.dev.yml),
# el backend (Spring Boot) y el frontend (Vite), y abre /registro en el navegador.
#
# Ctrl+C detiene el backend y el frontend. Postgres/Redis quedan corriendo
# (son datos persistentes de desarrollo) — para bajarlos:
#   docker compose -f docker-compose.dev.yml down
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.dev-logs"
BACKEND_LOG="$LOG_DIR/backend.log"

mkdir -p "$LOG_DIR"

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
  exec ./mvnw spring-boot:run
) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

cleanup() {
  echo
  echo "==> Deteniendo el backend..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
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

( sleep 3 && open "http://localhost:5173/registro" ) &

echo "==> Iniciando el frontend (pnpm dev)..."
cd "$FRONTEND_DIR"
pnpm dev
