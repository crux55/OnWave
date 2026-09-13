#!/bin/bash
# Encrypted local backup of OnWave's production data: the MySQL database,
# the uploads directory (avatars, cached favicons), and .env.production
# itself (needed to actually redeploy from a backup, not just restore data).
#
# This protects against soft failures (a bad migration, an accidental
# DELETE, application corruption) since it's a separate point-in-time copy
# — it does NOT protect against losing the whole machine (disk death, fire,
# theft), since it lives on the same disk as everything it's backing up.
# Off-site upload is a deliberate follow-up, not done here yet.
#
# Meant to run as root's or andru's cron job on the production host
# (192.168.1.110), not manually per-deploy.
set -euo pipefail

BACKUP_DIR="/home/andru/onwave-backups"
RECIPIENT_FILE="$BACKUP_DIR/age-recipient.txt"
ENV_FILE="/home/andru/Code/React/OnWave/.env.production"
UPLOADS_DIR="/home/andru/Code/React/OnWave/uploads"
MYSQL_CONTAINER="onwave_mysql_1"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if [ ! -f "$RECIPIENT_FILE" ]; then
  echo "ERROR: age recipient file not found at $RECIPIENT_FILE" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

# Pull DB creds from the same env file the app itself runs on, rather than
# hardcoding them a second place they'd have to be kept in sync.
MYSQL_ROOT_PASSWORD=$(grep -E '^MYSQL_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
MYSQL_DATABASE=$(grep -E '^MYSQL_DATABASE=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$MYSQL_ROOT_PASSWORD" ] || [ -z "$MYSQL_DATABASE" ]; then
  echo "ERROR: could not read MYSQL_ROOT_PASSWORD/MYSQL_DATABASE from $ENV_FILE" >&2
  exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

echo "Dumping database..."
docker exec "$MYSQL_CONTAINER" mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE" > "$WORKDIR/db.sql"

echo "Copying uploads..."
cp -r "$UPLOADS_DIR" "$WORKDIR/uploads"

echo "Copying .env.production..."
cp "$ENV_FILE" "$WORKDIR/env.production"

ARCHIVE="$WORKDIR/onwave-backup-$TIMESTAMP.tar.gz"
echo "Archiving..."
tar -czf "$ARCHIVE" -C "$WORKDIR" db.sql uploads env.production

ENCRYPTED="$BACKUP_DIR/onwave-backup-$TIMESTAMP.tar.gz.age"
echo "Encrypting..."
age -r "$(cat "$RECIPIENT_FILE")" -o "$ENCRYPTED" "$ARCHIVE"

echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -maxdepth 1 -name 'onwave-backup-*.tar.gz.age' -mtime "+$RETENTION_DAYS" -print -delete

echo "Backup complete: $ENCRYPTED ($(du -h "$ENCRYPTED" | cut -f1))"
