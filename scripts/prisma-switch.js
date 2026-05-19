#!/usr/bin/env node

/**
 * prisma-switch.js
 * Automatically switches Prisma schema between SQLite (local) and PostgreSQL (production/Vercel)
 * based on the DATABASE_URL environment variable.
 *
 * Usage: node scripts/prisma-switch.js
 * This is called as part of the Vercel build command:
 *   node scripts/prisma-switch.js && npx prisma generate && next build
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function main() {
    const databaseUrl = process.env.DATABASE_URL || '';
    const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

    if (!fs.existsSync(SCHEMA_PATH)) {
        console.error('❌ prisma/schema.prisma not found');
        process.exit(1);
    }

    let schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    if (isPostgres) {
        // Switch to PostgreSQL provider
        schema = schema.replace(
            /provider\s*=\s*"sqlite"/,
            'provider = "postgresql"'
        );
        console.log('✅ Switched Prisma provider to PostgreSQL (DATABASE_URL detected)');
    } else {
        // Ensure SQLite provider (default)
        schema = schema.replace(
            /provider\s*=\s*"postgresql"/,
            'provider = "sqlite"'
        );
        console.log('✅ Using Prisma provider: SQLite (no PostgreSQL URL detected)');
    }

    fs.writeFileSync(SCHEMA_PATH, schema);
}

main();
