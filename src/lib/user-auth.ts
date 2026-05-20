import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import { db, ensureDbConnection } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'goalzone-jwt-secret-key-change-in-production'
)

/**
 * bcrypt salt rounds — 10 for Vercel serverless compatibility
 * 12 rounds can timeout on cold starts with limited CPU
 */
const SALT_ROUNDS = 10

// ===== Password Hashing with bcryptjs =====

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ===== JWT Token Management =====

export interface UserTokenPayload {
  userId: string
  email: string
  name: string
  role: string
  provider: string
}

export async function signUserToken(payload: UserTokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as unknown as UserTokenPayload
}

// ===== Email Validation =====

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ===== Password Validation =====

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung minimal 1 huruf besar' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung minimal 1 huruf kecil' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung minimal 1 angka' }
  }
  return { valid: true, message: '' }
}

// ===== User Lookup =====

export async function getUserByEmail(email: string) {
  await ensureDbConnection(2)
  return db.user.findUnique({ where: { email } })
}

export async function createUser(data: {
  name: string
  email: string
  passwordHash?: string
  image?: string
  provider: string
  providerAccountId?: string
}) {
  await ensureDbConnection(2)
  return db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash || null,
      image: data.image || '',
      provider: data.provider,
      providerAccountId: data.providerAccountId || '',
      emailVerified: data.provider === 'google' ? new Date() : null,
    },
  })
}
