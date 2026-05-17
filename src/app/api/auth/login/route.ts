import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, comparePassword, signUserToken } from '@/lib/user-auth'
import { db } from '@/lib/db'
import { comparePassword as compareAdminPassword, signToken } from '@/lib/auth'

// CSRF protection — validate Origin header
function validateCSRF(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin) return true
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
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      )
    }

    const trimmedEmail = String(email).trim().toLowerCase()

    // ===== Try User table first (registered users) =====
    const user = await getUserByEmail(trimmedEmail)

    if (user) {
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Akun Anda dinonaktifkan' },
          { status: 401 }
        )
      }

      // OAuth-only users can't login with password
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: 'Akun ini tidak memiliki password. Silakan daftar ulang.' },
          { status: 401 }
        )
      }

      const isValid = await comparePassword(password, user.passwordHash)

      if (!isValid) {
        return NextResponse.json(
          { error: 'Email atau password salah' },
          { status: 401 }
        )
      }

      // Generate JWT token for regular user
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

      // Normalize to match LoginUser interface expected by frontend
      const normalizedUser = {
        ...userWithoutPassword,
        username: user.email, // Use email as username for regular users
        displayName: user.name,
        avatarUrl: user.image,
      }

      return NextResponse.json({
        token,
        user: normalizedUser,
      })
    }

    // ===== Fallback: Try AdminUser table (admin users) =====
    // Allow admin login with either username or email
    const adminUser = await db.adminUser.findFirst({
      where: {
        OR: [
          { username: email },
          { email: trimmedEmail },
        ],
      },
    })

    if (adminUser) {
      if (!adminUser.isActive) {
        return NextResponse.json(
          { error: 'Akun Anda dinonaktifkan' },
          { status: 401 }
        )
      }

      const isValid = await compareAdminPassword(password, adminUser.passwordHash)

      if (!isValid) {
        return NextResponse.json(
          { error: 'Email atau password salah' },
          { status: 401 }
        )
      }

      // Generate JWT token for admin
      const token = await signToken({
        userId: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      })

      // Update last login (non-blocking)
      db.adminUser.update({
        where: { id: adminUser.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {})

      // Create activity log (non-blocking)
      db.activityLog.create({
        data: {
          userId: adminUser.id,
          action: 'login',
          resource: 'auth',
          resourceId: adminUser.id,
          details: JSON.stringify({ username: adminUser.username }),
        },
      }).catch(() => {})

      // Return admin user data without passwordHash
      const { passwordHash: _ph, ...adminWithoutPassword } = adminUser

      // Normalize to match LoginUser interface expected by frontend
      const normalizedAdmin = {
        ...adminWithoutPassword,
        displayName: adminUser.displayName || adminUser.username,
        avatarUrl: adminUser.avatarUrl,
      }

      return NextResponse.json({
        token,
        user: normalizedAdmin,
      })
    }

    // No user found in either table
    return NextResponse.json(
      { error: 'Email atau password salah' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
