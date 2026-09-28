#!/usr/bin/env bash
# exit script if we hit an error to prevent silently failing backups
set -euo pipefail

# set data directory if it is unset, can be overridden for local backup/testing
DATA_DIR="${DATA_DIR:-/app/data}"
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
WORK_DIR="/tmp/backup-${TS}"
ARCHIVE="/tmp/backup-${TS}.tar.gz"

# clean up working backup files
trap 'rm -rf "$WORK_DIR" "$ARCHIVE"' EXIT

mkdir -p "$WORK_DIR"

# safely backup sqlite even if it is in use
sqlite3 "$DATA_DIR/achievements.db" ".backup $WORK_DIR/achievements.db"
# copy all non database files to the working directory
rsync -av --exclude '*.db*' "$DATA_DIR/" "$WORK_DIR/"

# create compressed archive
tar czf "$ARCHIVE" -C "$WORK_DIR" .

# upload to cloudflare r2
aws s3 cp "$ARCHIVE" "s3://cc-website-backup/backup-${TS}.tar.gz" \
  --endpoint-url "$BACKUP_R2_URL"

echo "Backup uploaded: backup-${TS}.tar.gz"