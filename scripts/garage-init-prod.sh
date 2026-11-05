#!/usr/bin/env bash
# Idempotent first-time setup of the production Garage node: layout, access key, bucket, public web mode and media alias.
# Run on the VPS from the repo root after `docker compose -f docker-compose.prod.yml up -d`.
# Reads STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET and MEDIA_DOMAIN from .env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; source "$ROOT_DIR/.env"; set +a
: "${STORAGE_ACCESS_KEY:?}" "${STORAGE_SECRET_KEY:?}" "${MEDIA_DOMAIN:?}"
BUCKET="${STORAGE_BUCKET:-platos}"
COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.prod.yml")

garage() { "${COMPOSE[@]}" exec -T -e RUST_LOG=warn garage /garage "$@"; }

ATTEMPTS=0
until garage status > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "!! Garage no respondió. Revisa: docker compose -f docker-compose.prod.yml logs garage" >&2
    exit 1
  fi
  sleep 1
done

if garage status 2>/dev/null | grep -q "NO ROLE ASSIGNED"; then
  NODE_ID="$(garage node id -q | cut -d@ -f1)"
  VERSION="$(garage layout show 2>/dev/null | sed -n 's/.*[Cc]urrent cluster layout version: *\([0-9]*\).*/\1/p' | head -n1)"
  garage layout assign -z dc1 -c 20G "$NODE_ID" > /dev/null
  garage layout apply --version "$(( ${VERSION:-0} + 1 ))" > /dev/null
  echo "==> Layout aplicado"
fi

if ! garage key info "$STORAGE_ACCESS_KEY" > /dev/null 2>&1; then
  garage key import --yes -n app "$STORAGE_ACCESS_KEY" "$STORAGE_SECRET_KEY" > /dev/null
  echo "==> Clave importada"
fi

if ! garage bucket info "$BUCKET" > /dev/null 2>&1; then
  garage bucket create "$BUCKET" > /dev/null
  echo "==> Bucket $BUCKET creado"
fi
garage bucket allow --read --write --owner "$BUCKET" --key "$STORAGE_ACCESS_KEY" > /dev/null
garage bucket website --allow "$BUCKET" > /dev/null
garage bucket alias "$BUCKET" "$MEDIA_DOMAIN" > /dev/null 2>&1 || true
echo "==> Garage listo: https://$MEDIA_DOMAIN"
