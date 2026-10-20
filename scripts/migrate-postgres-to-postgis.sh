#!/usr/bin/env bash
# One-time migration of the local dev database from the old postgres:16 volume to the PostGIS image/volume.
# It dumps and restores (instead of reusing the old volume) so that every index is rebuilt by the new image,
# and it never touches the old volume: delete it yourself once you have checked the app.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.dev.yml")
PROJECT="$(basename "$ROOT_DIR")"
OLD_VOLUME="${PROJECT}_postgres_dev_data"
NEW_VOLUME="${PROJECT}_postgis_dev_data"
DB=salazar_dev
DB_USER=salazar
OLD_CONTAINER=salazar-postgres-old
NEW_CONTAINER="${PROJECT}-postgres-1"
BACKUP_DIR="${BACKUP_DIR:-$HOME/salazar-backups}"
BACKUP="$BACKUP_DIR/${DB}-$(date +%Y%m%d-%H%M%S).dump"

if ! docker volume inspect "$OLD_VOLUME" > /dev/null 2>&1; then
  echo "No existe el volumen $OLD_VOLUME: no hay nada que migrar (se creará una base nueva)."
  exit 0
fi
if docker volume inspect "$NEW_VOLUME" > /dev/null 2>&1; then
  echo "!! El volumen $NEW_VOLUME ya existe: la migración ya se hizo. Bórralo si quieres repetirla." >&2
  exit 1
fi

# Rows per table, plus the Flyway history, as "table|count" lines
snapshot() {
  local container="$1" table
  docker exec "$container" psql -U "$DB_USER" -d "$DB" -Atc "select tablename from pg_tables where schemaname = 'public' order by 1" |
    while read -r table; do
      echo "$table|$(docker exec "$container" psql -U "$DB_USER" -d "$DB" -Atc "select count(*) from \"$table\"")"
    done
  docker exec "$container" psql -U "$DB_USER" -d "$DB" -Atc "select 'flyway|' || string_agg(version || ':' || checksum, ',' order by installed_rank) from flyway_schema_history where version is not null"
}

wait_ready() {
  local attempts=0
  until docker exec "$1" pg_isready -U "$DB_USER" -d "$DB" > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 60 ] || [ "$(docker inspect -f '{{.State.Running}}' "$1")" != true ]; then
      echo "!! $1 no arrancó. Revisa: docker logs $1" >&2
      exit 1
    fi
    sleep 1
  done
}

echo "==> Deteniendo el Postgres de docker compose (para liberar el volumen viejo)..."
"${COMPOSE[@]}" stop postgres > /dev/null 2>&1 || true

echo "==> Levantando el volumen viejo con postgres:16 (solo lectura lógica, sin puertos)..."
docker rm -f "$OLD_CONTAINER" > /dev/null 2>&1 || true
docker run -d --name "$OLD_CONTAINER" -v "$OLD_VOLUME:/var/lib/postgresql/data" postgres:16 > /dev/null
trap 'docker rm -f "$OLD_CONTAINER" > /dev/null 2>&1 || true' EXIT
wait_ready "$OLD_CONTAINER"

BEFORE="$(snapshot "$OLD_CONTAINER")"
echo "$BEFORE" | sed 's/^/    antes: /'

echo "==> Respaldo en $BACKUP..."
mkdir -p "$BACKUP_DIR"
docker exec "$OLD_CONTAINER" pg_dump -U "$DB_USER" -d "$DB" -Fc > "$BACKUP"
[ -s "$BACKUP" ] || { echo "!! El respaldo quedó vacío; no se continúa." >&2; exit 1; }
docker exec -i "$OLD_CONTAINER" pg_restore -l < "$BACKUP" > /dev/null || { echo "!! El respaldo no se puede leer; no se continúa." >&2; exit 1; }

docker rm -f "$OLD_CONTAINER" > /dev/null
trap - EXIT

echo "==> Construyendo y levantando el Postgres con PostGIS (volumen nuevo $NEW_VOLUME)..."
"${COMPOSE[@]}" build postgres
"${COMPOSE[@]}" up -d postgres
wait_ready "$NEW_CONTAINER"

echo "==> Restaurando..."
docker exec -i "$NEW_CONTAINER" pg_restore -U "$DB_USER" -d "$DB" --no-owner --exit-on-error < "$BACKUP"

AFTER="$(snapshot "$NEW_CONTAINER")"
echo "$AFTER" | sed 's/^/    después: /'
if [ "$BEFORE" != "$AFTER" ]; then
  echo "!! Las filas o el historial de Flyway no coinciden. El volumen viejo $OLD_VOLUME sigue intacto; el respaldo está en $BACKUP." >&2
  exit 1
fi

echo "==> Migración verificada. Volumen viejo conservado: $OLD_VOLUME (bórralo con 'docker volume rm $OLD_VOLUME' cuando confirmes que todo funciona)."
echo "    Respaldo: $BACKUP"
