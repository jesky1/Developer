/**
 * Prisma Database Client for AI Service
 * Uses the shared schema at ../../prisma/schema.prisma
 * Loads .env from parent project to get DATABASE_URL
 */
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from parent project directory
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db