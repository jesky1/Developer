/**
 * Prisma Database Client — Vercel Serverless Compatible
 *
 * Handles environment variable loading for both local dev and Vercel:
 * - Local dev: System-level DATABASE_URL (SQLite) can override .env's Neon URL
 *   → Force-load .env with override=true to fix this
 * - Vercel: No system-level override, env vars injected directly by Vercel
 *   → dotenv.config() is harmless (no .env file at runtime, or same values)
 */

// Force-load .env BEFORE importing PrismaClient
// On Vercel: .env file doesn't exist at runtime, so dotenv does nothing
// On local dev: .env has the correct Neon URL, override fixes system-level SQLite URL
import dotenv from 'dotenv'
import path from 'path'

// Safely load .env with override — suppress errors if file doesn't exist
try {
  dotenv.config({ path: path.join(process.cwd(), '.env'), override: true })
} catch {
  // .env file doesn't exist (normal on Vercel runtime) — env vars already set by platform
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * PrismaClient singleton — optimized for Vercel serverless + Neon Postgres
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
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }
  console.error('All DB connection attempts failed')
  return false
}
