import { jwtVerify, SignJWT } from 'jose'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'goalzone-jwt-secret-key-change-in-production'
)

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

// Simple password hashing using HMAC-SHA256
// Format: salt:hash (both hex encoded)
// This avoids any native module compilation issues with bcryptjs
async function hmacHash(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await crypto.subtle.sign('HMAC', await getHmacKey(), data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

let _hmacKey: CryptoKey | null = null
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey
  _hmacKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('goalzone-hmac-key-for-passwords'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return _hmacKey
}

function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt()
  const hash = await hmacHash(password, salt)
  return `${salt}:${hash}`
}

export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const colonIndex = storedHash.indexOf(':')
    if (colonIndex === -1) return false
    const salt = storedHash.substring(0, colonIndex)
    const hash = storedHash.substring(colonIndex + 1)
    const computedHash = await hmacHash(password, salt)
    return computedHash === hash
  } catch {
    return false
  }
}

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    const user = await db.adminUser.findUnique({ where: { id: payload.userId } })
    return user
  } catch {
    return null
  }
}
