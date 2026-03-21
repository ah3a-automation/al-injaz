#!/usr/bin/env bash
# Al Injaz — backup PostgreSQL + optional S3 sync. Run via cron (e.g. nightly).
# Set env: BACKUP_DIR, PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD (or .pgpass)
# Optional: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, S3_BACKUP_BUCKET
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_NAME="postgres_${STAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Backing up PostgreSQL to ${BACKUP_DIR}/${DUMP_NAME} ..."
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --no-owner --format=plain "${PGDATABASE:-}" | gzip -c > "${BACKUP_DIR}/${DUMP_NAME}"
else
  echo "pg_dump not found. Install postgresql-client or run inside a container with pg_dump." >&2
  exit 1
fi

if [[ -n "${S3_BACKUP_BUCKET:-}" ]] && command -v aws >/dev/null 2>&1; then
  echo "Syncing ${BACKUP_DIR} to s3://${S3_BACKUP_BUCKET}/ ..."
  aws s3 sync "${BACKUP_DIR}/" "s3://${S3_BACKUP_BUCKET}/" --exclude "*" --include "postgres_*.sql.gz"
else
  echo "S3_BACKUP_BUCKET not set or aws CLI missing — skipping S3 sync."
fi

echo "Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR} ..."
find "${BACKUP_DIR}" -type f -name 'postgres_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete || true

echo "Done."
