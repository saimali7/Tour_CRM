#!/bin/bash
# =============================================================================
# Tour CRM - Database Backup Script
# =============================================================================
# Backs up PostgreSQL database to Backblaze B2
#
# Installation:
#   1. Copy to VPS: scp backup-database.sh root@your-vps:/opt/scripts/
#   2. Make executable: chmod +x /opt/scripts/backup-database.sh
#   3. Configure B2 credentials: aws configure (or set env vars)
#   4. Set up cron: crontab -e
#      0 3 * * * /opt/scripts/backup-database.sh >> /var/log/backup.log 2>&1
#
# Requirements:
#   - docker (to access PostgreSQL container)
#   - aws-cli (for Backblaze B2 uploads)
#   - gzip (for compression)
#
# Environment variables (or configure in script):
#   - POSTGRES_CONTAINER: Name/ID of PostgreSQL container (default: tour_postgres)
#   - POSTGRES_USER: Database user (default: tourcrm)
#   - POSTGRES_DB: Database name (default: tour_platform)
#   - B2_BUCKET: Backblaze B2 bucket name
#   - B2_ENDPOINT: Backblaze B2 endpoint URL
#   - AWS_ACCESS_KEY_ID: Backblaze B2 keyID
#   - AWS_SECRET_ACCESS_KEY: Backblaze B2 applicationKey
# =============================================================================

set -euo pipefail

# Configuration (override with environment variables)
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-tour_postgres}"
POSTGRES_USER="${POSTGRES_USER:-tourcrm}"
POSTGRES_DB="${POSTGRES_DB:-tour_platform}"
B2_BUCKET="${B2_BUCKET:-tour-crm-backups}"
B2_ENDPOINT="${B2_ENDPOINT:-https://s3.us-west-000.backblazeb2.com}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOCAL_RETENTION_HOURS="${LOCAL_RETENTION_HOURS:-24}"

# Generate timestamp and filename
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="tour_crm_${DATE}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log_info "Starting database backup..."

# Check if PostgreSQL container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    log_error "PostgreSQL container '${POSTGRES_CONTAINER}' is not running"
    exit 1
fi

# Create database dump
log_info "Dumping database ${POSTGRES_DB}..."
if docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_PATH}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    log_info "Database dump created: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    log_error "Failed to create database dump"
    exit 1
fi

# Verify backup file is not empty
if [ ! -s "${BACKUP_PATH}" ]; then
    log_error "Backup file is empty, aborting upload"
    rm -f "${BACKUP_PATH}"
    exit 1
fi

# Upload to Backblaze B2 (if configured)
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
    log_info "Uploading to Backblaze B2..."

    if aws s3 cp "${BACKUP_PATH}" "s3://${B2_BUCKET}/postgres-backups/${BACKUP_FILE}" \
        --endpoint-url "${B2_ENDPOINT}" \
        --quiet; then
        log_info "Backup uploaded to B2: s3://${B2_BUCKET}/postgres-backups/${BACKUP_FILE}"

        # Clean up remote backups older than retention period
        log_info "Cleaning up old backups from B2 (older than ${RETENTION_DAYS} days)..."
        CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

        aws s3 ls "s3://${B2_BUCKET}/postgres-backups/" \
            --endpoint-url "${B2_ENDPOINT}" 2>/dev/null | while read -r line; do
            FILE=$(echo "$line" | awk '{print $4}')
            if [ -n "$FILE" ]; then
                # Extract date from filename (tour_crm_YYYY-MM-DD_HH-MM-SS.sql.gz)
                FILE_DATE=$(echo "$FILE" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1)
                if [ -n "$FILE_DATE" ] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
                    log_info "Deleting old backup: ${FILE}"
                    aws s3 rm "s3://${B2_BUCKET}/postgres-backups/${FILE}" \
                        --endpoint-url "${B2_ENDPOINT}" --quiet || true
                fi
            fi
        done
    else
        log_error "Failed to upload backup to B2"
        # Don't exit, keep local backup
    fi
else
    log_warn "B2 credentials not configured, skipping cloud upload"
    log_warn "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for cloud backups"
fi

# Clean up local backups older than retention period
log_info "Cleaning up local backups older than ${LOCAL_RETENTION_HOURS} hours..."
find "${BACKUP_DIR}" -name "tour_crm_*.sql.gz" -type f -mmin +$((LOCAL_RETENTION_HOURS * 60)) -delete 2>/dev/null || true

# Summary
FINAL_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
log_info "Backup completed successfully!"
log_info "  File: ${BACKUP_PATH}"
log_info "  Size: ${FINAL_SIZE}"
log_info "  Database: ${POSTGRES_DB}"

exit 0
