#!/usr/bin/env bash
# ============================================================
# GOALZONE - Prisma Schema Auto-Switch
# Automatically selects the correct Prisma schema based on
# DATABASE_URL protocol:
#   - file: → SQLite (local development)
#   - postgresql:// or postgres:// → PostgreSQL (Vercel/production)
# ============================================================

set -e

SCHEMA_DIR="prisma"
SQLITE_SCHEMA="$SCHEMA_DIR/schema.sqlite.prisma"
PG_SCHEMA="$SCHEMA_DIR/schema.pg.prisma"
ACTIVE_SCHEMA="$SCHEMA_DIR/schema.prisma"

# Read DATABASE_URL
DB_URL="${DATABASE_URL:-}"

if [ -z "$DB_URL" ]; then
  echo "[prisma-switch] ⚠️  DATABASE_URL is not set. Defaulting to SQLite."
  DB_URL="file:./db/custom.db"
fi

# Detect database type from URL protocol
if [[ "$DB_URL" == file:* ]]; then
  echo "[prisma-switch] 📦 Detected SQLite (file: protocol)"
  if [ -f "$SQLITE_SCHEMA" ]; then
    cp "$SQLITE_SCHEMA" "$ACTIVE_SCHEMA"
    echo "[prisma-switch] ✅ Copied schema.sqlite.prisma → schema.prisma"
  else
    echo "[prisma-switch] ⚠️  schema.sqlite.prisma not found. Keeping current schema."
  fi
elif [[ "$DB_URL" == postgres:* ]] || [[ "$DB_URL" == postgresql:* ]]; then
  echo "[prisma-switch] 🐘 Detected PostgreSQL (postgresql: protocol)"
  if [ -f "$PG_SCHEMA" ]; then
    cp "$PG_SCHEMA" "$ACTIVE_SCHEMA"
    echo "[prisma-switch] ✅ Copied schema.pg.prisma → schema.prisma"
  else
    echo "[prisma-switch] ⚠️  schema.pg.prisma not found. Keeping current schema."
  fi
else
  echo "[prisma-switch] ❓ Unknown DATABASE_URL protocol: ${DB_URL:0:20}..."
  echo "[prisma-switch]    Expected 'file:' for SQLite or 'postgresql:' for PostgreSQL"
  echo "[prisma-switch]    Defaulting to SQLite schema."
  if [ -f "$SQLITE_SCHEMA" ]; then
    cp "$SQLITE_SCHEMA" "$ACTIVE_SCHEMA"
  fi
fi

echo "[prisma-switch] Active schema provider: $(grep 'provider = ' $ACTIVE_SCHEMA | head -1)"