import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { db, ensureDbConnection } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'goalzone-jwt-secret-key-change-in-production'
)

/**
 * bcrypt salt rounds — 10 rounds for Vercel serverless compatibility
 * 12 rounds can timeout on cold starts with limited CPU.
 * 10 rounds still provides strong security (~100ms on modern hardware).
 */
const BCRYPT_ROUNDS = 10

export async function signToken(payload: { userId: string; username: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as { userId: string; username: string; role: string }
}

/**
 * Hash password using bcryptjs (pure JS, no native compilation issues on Vercel)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Compare plain password against stored hash.
 * Supports legacy HMAC-SHA256 format (salt:hash) for migration.
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Support legacy HMAC-SHA256 format (salt:hash) during migration
    if (storedHash.includes(':') && storedHash.length < 100) {
      const legacyMatch = await compareLegacyHmac(password, storedHash)
      return legacyMatch
    }
    return bcrypt.compare(password, storedHash)
  } catch {
    return false
  }
}

/**
 * Legacy HMAC-SHA256 comparison for migrating old password hashes
 */
async function compareLegacyHmac(password: string, storedHash: string): Promise<boolean> {
  try {
    const colonIndex = storedHash.indexOf(':')
    if (colonIndex === -1) return false
    const salt = storedHash.substring(0, colonIndex)
    const hash = storedHash.substring(colonIndex + 1)
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('goalzone-hmac-key-for-passwords'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const data = new TextEncoder().encode(salt + password)
    const hashBuffer = await crypto.subtle.sign('HMAC', hmacKey, data)
    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return computedHash === hash
  } catch {
    return false
  }
}

/**
 * Get authenticated user from request Authorization header.
 * Ensures DB connection before querying (critical for Vercel serverless).
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const payload = await verifyToken(token)

    // Ensure DB connection before querying (Vercel cold start)
    const connected = await ensureDbConnection(2)
    if (!connected) return null

    const user = await db.adminUser.findUnique({ where: { id: payload.userId } })
    return user
  } catch (error) {
    console.error('getAuthUser error:', error)
    return null
  }
}

/**
 * Require admin authentication for API routes.
 * Returns the authenticated user or a 401 NextResponse.
 */
export async function requireAdminAuth(request: NextRequest) {
  const user = await getAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is disabled' },
      { status: 401 }
    )
  }

  return user
}

/**
 * Type guard: check if the result is an error response (not a user)
 */
export function isAuthError(result: Awaited<ReturnType<typeof requireAdminAuth>>): result is NextResponse {
  return result instanceof NextResponse
}
