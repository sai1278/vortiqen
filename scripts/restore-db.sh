#!/usr/bin/env bash
# ==============================================================================
# Vortiqen Production Database Restore Script
# Restores a custom-format pg_dump archive into target database.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_dump_file> [target_database_url]"
    exit 1
fi

DUMP_FILE="$1"
TARGET_DB="${2:-${DATABASE_URL}}"

if [ ! -f "${DUMP_FILE}" ]; then
    echo "Error: Backup file not found: ${DUMP_FILE}"
    exit 1
fi

# Verify checksum if present
if [ -f "${DUMP_FILE}.sha256" ]; then
    echo "==> Verifying SHA256 checksum..."
    sha256sum -c "${DUMP_FILE}.sha256"
fi

echo "==> Restoring ${DUMP_FILE} into target database..."
pg_restore \
    --dbname="${TARGET_DB}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    "${DUMP_FILE}"

echo "==> Restoration completed successfully."
