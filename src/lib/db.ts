/**
 * Prisma Database Client — Vercel Serverless Compatible
 *
 * CRITICAL FIX: System-level DATABASE_URL (SQLite) can override the .env file's
 * Neon Postgres URL. We force-load .env with override=true to ensure the correct
 * Neon URL is used for PrismaClient.
 *
 * On Vercel: No system-level override exists, so .env (or Vercel dashboard env vars)
 * are used directly — this code is harmless there.
 */

// Force-load .env BEFORE importing PrismaClient, so DATABASE_URL is correct
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true })

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * PrismaClient singleton — optimized for Vercel serverless + Neon Postgres
 *
 * Key design decisions:
 * 1. globalThis caching prevents multiple PrismaClient instances in dev (hot reload)
 * 2. On Vercel serverless, each cold start creates a fresh instance (expected)
 * 3. Explicit $connect() should be called before first query via ensureDbConnection()
 * 4. Neon pooler URL handles connection pooling automatically
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure database connection is established before querying.
 * Critical for Vercel serverless cold starts where PrismaClient
 * may not have connected yet.
 *
 * Includes retry logic for transient Neon connection failures.
 */
export async function ensureDbConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.$connect()
      return true
    } catch (error) {
      console.error(`DB connection attempt ${attempt}/${retries} failed:`, error)
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }
  console.error('All DB connection attempts failed')
  return false
}
