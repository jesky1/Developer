/**
 * Prisma Database Client for AI Service
 * Uses the shared schema at ../../prisma/schema.prisma
 * Works with SQLite locally and PostgreSQL in production
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
