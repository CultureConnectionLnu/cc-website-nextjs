#!/usr/bin/env bash
#
# Restore data from a backup archive in R2.
# Run: railway ssh -- bash /app/restore.bash <key>
# Then restart the service so the app reopens the restored DB.

# Exit on error, unset variables, and failed pipes to prevent silent bad restores
set -euo pipefail

KEY="${1:?usage: restore.bash <backup-file.tar.gz>}"
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
DATA_DIR="${DATA_DIR:-/app/data}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Download the archive and extract it to a scratch directory
aws s3 cp "s3://cc-website-backup/${KEY}" "$WORK_DIR/backup.tar.gz" \
  --endpoint-url "$BACKUP_R2_URL"
mkdir "$WORK_DIR/extracted"
tar xzf "$WORK_DIR/backup.tar.gz" -C "$WORK_DIR/extracted"

# Sanity check before touching live data
if ! sqlite3 "$WORK_DIR/extracted/achievements.db" "PRAGMA integrity_check;" | grep -qx ok; then
  echo "Integrity check failed for ${KEY}; live data untouched." >&2
  exit 1
fi

# Safety copy of the current DB (if any) so this restore can be undone
if [ -f "$DATA_DIR/achievements.db" ]; then
  sqlite3 "$DATA_DIR/achievements.db" ".backup '$DATA_DIR/achievements.db.pre-restore'"
fi

# Restore the DB via atomic rename, after removing stale WAL/SHM files
cp "$WORK_DIR/extracted/achievements.db" "$DATA_DIR/achievements.db.restoring"
rm -f "$DATA_DIR"/achievements.db-wal "$DATA_DIR"/achievements.db-shm
mv "$DATA_DIR/achievements.db.restoring" "$DATA_DIR/achievements.db"

# Restore everything else (public/*.json etc.)
rm "$WORK_DIR/extracted/achievements.db"
cp -a "$WORK_DIR/extracted/." "$DATA_DIR/"

echo "Restored ${KEY}. Restart the service now."