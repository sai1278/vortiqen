#!/usr/bin/env bash
# ==============================================================================
# Vortiqen Production Database Automated Backup Script
# Performs compressed pg_dump, calculates SHA256 checksum, and uploads to offsite S3/GCS.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/vortiqen_${TIMESTAMP}.dump"
S3_BUCKET="${BACKUP_S3_BUCKET:-s3://vortiqen-backups/postgres}"

mkdir -p "${BACKUP_DIR}"

echo "==> Starting PostgreSQL backup: ${BACKUP_FILE}"
pg_dump "${DATABASE_URL}" \
    --format=custom \
    --blobs \
    --no-owner \
    --no-privileges \
    --file="${BACKUP_FILE}"

# Compute checksum
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
echo "==> Backup completed successfully ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Upload to offsite storage if AWS CLI is configured
if command -v aws >/dev/null 2>&1 && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
    echo "==> Uploading to offsite storage: ${S3_BUCKET}"
    aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/daily/vortiqen_${TIMESTAMP}.dump" --sse aws:kms
    aws s3 cp "${BACKUP_FILE}.sha256" "${S3_BUCKET}/daily/vortiqen_${TIMESTAMP}.dump.sha256"
    echo "==> Offsite sync complete."
fi

# Rotate local backups older than 7 days
find "${BACKUP_DIR}" -type f -name "vortiqen_*.dump*" -mtime +7 -delete
echo "==> Rotation complete."
