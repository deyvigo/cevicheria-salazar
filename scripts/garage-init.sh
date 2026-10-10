#!/usr/bin/env bash
# Idempotent first-time setup of the local Garage node: layout, access key, bucket, public web mode and sample images.
# Garage's image has no shell, so everything goes through `docker compose exec garage /garage`.
# Expects STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY and STORAGE_BUCKET in the environment (dev.sh loads them from backend/.env).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.dev.yml")
S3_ENDPOINT="${STORAGE_ENDPOINT:-http://localhost:3900}"
BUCKET="${STORAGE_BUCKET:-platos}"
: "${STORAGE_ACCESS_KEY:?}" "${STORAGE_SECRET_KEY:?}"

garage() { "${COMPOSE[@]}" exec -T -e RUST_LOG=warn garage /garage "$@"; }

echo "==> Esperando a Garage..."
ATTEMPTS=0
until garage status > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "!! Garage no respondió. Revisa: docker compose -f docker-compose.dev.yml logs garage" >&2
    exit 1
  fi
  sleep 1
done

if garage status 2>/dev/null | grep -q "NO ROLE ASSIGNED"; then
  NODE_ID="$(garage node id -q | cut -d@ -f1)"
  VERSION="$(garage layout show 2>/dev/null | sed -n 's/.*[Cc]urrent cluster layout version: *\([0-9]*\).*/\1/p' | head -n1)"
  garage layout assign -z dc1 -c 1G "$NODE_ID" > /dev/null
  garage layout apply --version "$(( ${VERSION:-0} + 1 ))" > /dev/null
  echo "==> Layout aplicado"
fi

if ! garage key info "$STORAGE_ACCESS_KEY" > /dev/null 2>&1; then
  garage key import --yes -n dev "$STORAGE_ACCESS_KEY" "$STORAGE_SECRET_KEY" > /dev/null
  echo "==> Clave de desarrollo importada"
fi

if ! garage bucket info "$BUCKET" > /dev/null 2>&1; then
  garage bucket create "$BUCKET" > /dev/null
  echo "==> Bucket $BUCKET creado"
fi
garage bucket allow --read --write --owner "$BUCKET" --key "$STORAGE_ACCESS_KEY" > /dev/null
garage bucket website --allow "$BUCKET" > /dev/null

# One photo stands in for every sample dish (the dev seed points all products at seed/dish.jpg)
curl -sf --aws-sigv4 "aws:amz:garage:s3" --user "$STORAGE_ACCESS_KEY:$STORAGE_SECRET_KEY" \
  -H "Content-Type: image/jpeg" -T "$ROOT_DIR/frontend/public/background.jpg" \
  "$S3_ENDPOINT/$BUCKET/seed/dish.jpg" > /dev/null
# Extra labeled images so the detail gallery shows visibly different pictures
for IMAGE in "$ROOT_DIR"/scripts/seed-images/*.svg; do
  curl -sf --aws-sigv4 "aws:amz:garage:s3" --user "$STORAGE_ACCESS_KEY:$STORAGE_SECRET_KEY" \
    -H "Content-Type: image/svg+xml" -T "$IMAGE" \
    "$S3_ENDPOINT/$BUCKET/seed/$(basename "$IMAGE")" > /dev/null
done
echo "==> Garage listo (imágenes de ejemplo en $BUCKET/seed/)"
