#!/usr/bin/env node

/**
 * prisma-switch.js
 * Automatically switches Prisma schema between SQLite (local) and PostgreSQL (production/Vercel)
 * based on the DATABASE_URL environment variable.
 *
 * Usage: node scripts/prisma-switch.js
 * This is called as part of the Vercel build command:
 *   node scripts/prisma-switch.js && prisma generate && prisma db push && prisma db seed && next build
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

        // Ensure directUrl is present for Neon Postgres (required for migrations)
        if (!schema.includes('directUrl')) {
            schema = schema.replace(
                /(url\s*=\s*env\("DATABASE_URL"\))/,
                '$1\n  directUrl = env("DIRECT_URL")'
            );
        }

        console.log('✅ Switched Prisma provider to PostgreSQL (DATABASE_URL detected)');
        console.log(`   URL: ${databaseUrl.substring(0, 30)}...`);
    } else {
        // Switch to SQLite provider (default for local development)
        schema = schema.replace(
            /provider\s*=\s*"postgresql"/,
            'provider = "sqlite"'
        );

        // Remove directUrl line (not needed for SQLite)
        schema = schema.replace(/\n\s*directUrl\s*=\s*env\("DIRECT_URL"\)/, '');

        console.log('✅ Using Prisma provider: SQLite (no PostgreSQL URL detected)');
    }

    fs.writeFileSync(SCHEMA_PATH, schema);
}

main();
