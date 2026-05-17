import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, isValidEmail, validatePassword, getUserByEmail, createUser, signUserToken } from '@/lib/user-auth'
import { db } from '@/lib/db'

// CSRF protection — validate Origin header
function validateCSRF(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // Allow same-origin requests
  if (!origin) return true // API calls without origin (e.g. server-side)
  if (!host) return false

  try {
    const originUrl = new URL(origin)
    return originUrl.host === host
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // CSRF check
  if (!validateCSRF(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak valid (CSRF check failed)' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { name, email, password, confirmPassword } = body

    // ===== Validation =====

    // Check required fields
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      )
    }

    // Trim whitespace
    const trimmedName = String(name).trim()
    const trimmedEmail = String(email).trim().toLowerCase()

    // Name validation
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Nama minimal 2 karakter' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Nama terlalu panjang (maks 100 karakter)' },
        { status: 400 }
      )
    }

    // Email validation
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    // Password validation
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      )
    }

    // Confirm password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Konfirmasi password tidak cocok' },
        { status: 400 }
      )
    }

    // Check if email already registered
    const existingUser = await getUserByEmail(trimmedEmail)
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // ===== Create User =====

    const hashedPassword = await hashPassword(password)

    const user = await createUser({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash: hashedPassword,
      provider: 'credentials',
    })

    // ===== Generate Token =====

    const token = await signUserToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    })

    // Update last login (non-blocking)
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {})

    // Return user data without passwordHash
    const { passwordHash: _ph, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Registrasi berhasil!',
      token,
      user: userWithoutPassword,
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
