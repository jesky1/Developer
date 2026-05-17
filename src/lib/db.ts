import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Safe Prisma client initialization.
 * Handles the case where DATABASE_URL doesn't match the configured provider
 * (e.g., PostgreSQL URL with SQLite schema or vice versa).
 */
function createPrismaClient(): PrismaClient {
  try {
    const client = new PrismaClient()
    return client
  } catch (error) {
    console.error('[DB] Failed to initialize Prisma client:', error)
    throw error
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Check if the database is accessible.
 * Returns true if DB is working, false if there's a connection/schema mismatch.
 */
export async function isDbConnected(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
