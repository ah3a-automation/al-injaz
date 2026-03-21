#!/usr/bin/env bash
# Al Injaz — production deploy (run on the application server).
# Usage: ./deploy.sh [--skip-git-pull] [--skip-npm]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${ROOT}/src"
COMPOSE_PROD="${ROOT}/docker-compose.prod.yml"
MAINT_SECRET="${MAINT_SECRET:-}"

cd "${SRC}"

if [[ ! -f artisan ]]; then
  echo "Expected Laravel app at ${SRC} (artisan not found)." >&2
  exit 1
fi

SKIP_GIT=0
SKIP_NPM=0
for arg in "$@"; do
  case "${arg}" in
    --skip-git-pull) SKIP_GIT=1 ;;
    --skip-npm) SKIP_NPM=1 ;;
  esac
done

if [[ "${SKIP_GIT}" -eq 0 ]]; then
  git pull --ff-only
fi

echo "Installing PHP dependencies (no dev)..."
composer install --no-dev --optimize-autoloader --no-interaction

if [[ "${SKIP_NPM}" -eq 0 ]]; then
  echo "Building frontend assets..."
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
fi

DOWN_ARGS=(--refresh=15)
if [[ -n "${MAINT_SECRET}" ]]; then
  DOWN_ARGS+=(--secret="${MAINT_SECRET}")
fi

php artisan down "${DOWN_ARGS[@]}" || true

if ! php artisan migrate --force --no-interaction; then
  echo "Migration failed — bringing application back up." >&2
  php artisan up || true
  exit 1
fi

php artisan optimize:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

php artisan up || true

if command -v docker >/dev/null 2>&1 && [[ -f "${COMPOSE_PROD}" ]]; then
  echo "Restarting Horizon and Reverb (docker compose)..."
  (cd "${ROOT}" && docker compose -f docker-compose.prod.yml restart horizon reverb) || true
fi

echo "Deploy finished. If not using Docker, restart php-fpm, Horizon, and Reverb via systemd/supervisor."
