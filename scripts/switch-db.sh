#!/bin/bash
# GOALZONE Database Switcher
# Usage:
#   ./scripts/switch-db.sh local    - Switch to SQLite for local development
#   ./scripts/switch-db.sh prod     - Switch to PostgreSQL for Vercel production
#   ./scripts/switch-db.sh status   - Show current database config

SCHEMA_FILE="prisma/schema.prisma"
SQLITE_SCHEMA="prisma/schema.sqlite.prisma"
PG_SCHEMA="prisma/schema.postgresql.prisma"
ENV_FILE=".env"
ENV_LOCAL_FILE=".env.local"
ENV_PROD_FILE=".env.production"

case "$1" in
  local)
    echo "🔄 Switching to SQLite (local development)..."
    cp "$SQLITE_SCHEMA" "$SCHEMA_FILE"
    cp "$ENV_LOCAL_FILE" "$ENV_FILE" 2>/dev/null || true
    npx prisma generate
    echo "✅ Now using SQLite for local development"
    echo "   Run: bun run db:push && bun run dev"
    ;;

  prod)
    echo "🔄 Switching to PostgreSQL (production/Vercel)..."
    cp "$PG_SCHEMA" "$SCHEMA_FILE" 2>/dev/null || true
    cp "$ENV_PROD_FILE" "$ENV_FILE" 2>/dev/null || true
    npx prisma generate
    echo "✅ Now using PostgreSQL for production"
    echo "   Run: npx prisma migrate deploy"
    ;;

  status)
    PROVIDER=$(grep 'provider' "$SCHEMA_FILE" | head -2 | tail -1 | tr -d ' "' | cut -d= -f2)
    DB_URL=$(grep '^DATABASE_URL' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
    echo "📊 Current Database Config:"
    echo "   Provider: $PROVIDER"
    echo "   URL: $DB_URL"
    ;;

  *)
    echo "GOALZONE Database Switcher"
    echo ""
    echo "Usage:"
    echo "  ./scripts/switch-db.sh local    - Switch to SQLite for local development"
    echo "  ./scripts/switch-db.sh prod     - Switch to PostgreSQL for Vercel production"
    echo "  ./scripts/switch-db.sh status   - Show current database config"
    ;;
esac
