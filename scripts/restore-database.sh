#!/bin/bash
# =============================================================================
# Tour CRM - Database Restore Script
# =============================================================================
# Restores PostgreSQL database from backup
#
# Usage:
#   ./restore-database.sh [backup-file]
#   ./restore-database.sh                      # Interactive: lists available backups
#   ./restore-database.sh tour_crm_2024-01-15.sql.gz  # Restore specific backup
#
# The script will:
#   1. Stop the CRM application (if running)
#   2. Restore the database
#   3. Restart the CRM application
#
# WARNING: This will REPLACE all data in the database!
# =============================================================================

set -euo pipefail

# Configuration
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-tour_postgres}"
POSTGRES_USER="${POSTGRES_USER:-tourcrm}"
POSTGRES_DB="${POSTGRES_DB:-tour_platform}"
B2_BUCKET="${B2_BUCKET:-tour-crm-backups}"
B2_ENDPOINT="${B2_ENDPOINT:-https://s3.us-west-000.backblazeb2.com}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
CRM_CONTAINER="${CRM_CONTAINER:-tour_crm}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

list_backups() {
    echo -e "${BLUE}=== Local Backups ===${NC}"
    if [ -d "${BACKUP_DIR}" ]; then
        ls -lh "${BACKUP_DIR}"/tour_crm_*.sql.gz 2>/dev/null || echo "  No local backups found"
    else
        echo "  Backup directory not found"
    fi

    echo ""
    echo -e "${BLUE}=== Remote Backups (B2) ===${NC}"
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        aws s3 ls "s3://${B2_BUCKET}/postgres-backups/" \
            --endpoint-url "${B2_ENDPOINT}" 2>/dev/null | tail -20 || echo "  Could not list B2 backups"
    else
        echo "  B2 credentials not configured"
    fi
}

download_from_b2() {
    local filename="$1"
    local local_path="${BACKUP_DIR}/${filename}"

    log_info "Downloading ${filename} from B2..."
    mkdir -p "${BACKUP_DIR}"

    if aws s3 cp "s3://${B2_BUCKET}/postgres-backups/${filename}" "${local_path}" \
        --endpoint-url "${B2_ENDPOINT}"; then
        log_info "Downloaded to ${local_path}"
        echo "${local_path}"
    else
        log_error "Failed to download from B2"
        exit 1
    fi
}

restore_database() {
    local backup_file="$1"

    # Verify backup file exists
    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        exit 1
    fi

    # Verify PostgreSQL container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
        log_error "PostgreSQL container '${POSTGRES_CONTAINER}' is not running"
        exit 1
    fi

    log_info "Restoring database from: ${backup_file}"
    log_warn "This will REPLACE all data in ${POSTGRES_DB}!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Stop CRM application
    log_info "Stopping CRM application..."
    docker stop "${CRM_CONTAINER}" 2>/dev/null || log_warn "CRM container not running or not found"

    # Drop and recreate database
    log_info "Recreating database..."
    docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
    docker exec "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

    # Restore from backup
    log_info "Restoring data..."
    if gunzip -c "${backup_file}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"; then
        log_info "Database restored successfully!"
    else
        log_error "Database restore failed!"
        exit 1
    fi

    # Start CRM application
    log_info "Starting CRM application..."
    docker start "${CRM_CONTAINER}" 2>/dev/null || log_warn "Could not start CRM container"

    log_info "Restore complete!"
}

# Main
if [ $# -eq 0 ]; then
    # Interactive mode: list backups
    list_backups
    echo ""
    echo "Usage: $0 <backup-filename>"
    echo "  For local backup:  $0 /tmp/backups/tour_crm_2024-01-15_03-00-00.sql.gz"
    echo "  For B2 backup:     $0 tour_crm_2024-01-15_03-00-00.sql.gz  (will download first)"
    exit 0
fi

BACKUP_FILE="$1"

# If just a filename (not full path), check if it's in B2
if [[ ! "${BACKUP_FILE}" == /* ]]; then
    LOCAL_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
    if [ -f "${LOCAL_PATH}" ]; then
        BACKUP_FILE="${LOCAL_PATH}"
    else
        # Try to download from B2
        BACKUP_FILE=$(download_from_b2 "${BACKUP_FILE}")
    fi
fi

restore_database "${BACKUP_FILE}"
