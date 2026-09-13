#!/bin/bash
#
# Database Backup Script for SonTag POS
# 
# Usage: ./backup-db.sh [backup_dir]
#
# Environment variables required:
#   DATABASE_URL - PostgreSQL connection string
#
# Or individual variables:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#

set -e

# Configuration
BACKUP_DIR="${1:-/var/backups/sontag-pos}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sontag_pos_${TIMESTAMP}.sql.gz"

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
    # Extract components from postgresql://user:pass@host:port/dbname
    PGUSER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGHOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
    PGPORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Default port if not specified
    PGPORT="${PGPORT:-5432}"
fi

# Validate required variables
if [ -z "$PGHOST" ] || [ -z "$PGDATABASE" ]; then
    echo "Error: Database connection details not provided"
    echo "Set DATABASE_URL or PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=== SonTag POS Database Backup ==="
echo "Timestamp: $(date)"
echo "Database: $PGDATABASE@$PGHOST:$PGPORT"
echo "Backup file: $BACKUP_DIR/$BACKUP_FILE"
echo ""

# Export password for pg_dump
export PGPASSWORD

# Perform backup with compression
echo "Starting backup..."
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --format=plain \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully!"
    echo "Size: $SIZE"
else
    echo "Error: Backup file was not created"
    exit 1
fi

# Clean up old backups
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "sontag_pos_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/sontag_pos_*.sql.gz 2>/dev/null | wc -l)
echo "Remaining backups: $REMAINING"

# Create latest symlink
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"

echo ""
echo "=== Backup Complete ==="
echo "To restore: gunzip -c $BACKUP_DIR/$BACKUP_FILE | psql -h HOST -U USER -d DATABASE"
