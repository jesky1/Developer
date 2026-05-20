import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbConnection } from '@/lib/db'
import { signToken, comparePassword, hashPassword, getAuthUser } from '@/lib/auth'

/**
 * Admin Auth API Route — Vercel Serverless Compatible
 *
 * Key fixes for Vercel deployment:
 * 1. Static imports (not dynamic) — avoids cold-start module resolution failures
 * 2. Explicit $connect() before DB queries via ensureDbConnection()
 * 3. Retry logic for transient Neon connection failures
 * 4. Detailed error logging for Vercel runtime logs
 * 5. Reduced bcrypt rounds (10 instead of 12) for serverless CPU limits
 * 6. Proper error responses with diagnostic info (non-sensitive)
 */

// ─── GET /api/admin/auth ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'me'

  try {
    switch (action) {
      case 'me': {
        const user = await getAuthUser(request)

        if (!user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        if (!user.isActive) {
          return NextResponse.json(
            { error: 'Account is disabled' },
            { status: 401 }
          )
        }

        // Return user data without password
        const { passwordHash: _ph, ...userWithoutPassword } = user

        return NextResponse.json({ user: userWithoutPassword })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auth GET (${action}) error:`, error)
    return NextResponse.json(
      { error: 'Internal server error', action },
      { status: 500 }
    )
  }
}

// ─── POST /api/admin/auth ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'login'

  try {
    switch (action) {
      case 'login': {
        return await handleLogin(request)
      }

      case 'change-password': {
        return await handleChangePassword(request)
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auth POST (${action}) error:`, error)

    // Return diagnostic info to help debug Vercel issues
    const errorDetails =
      error instanceof Error
        ? {
          message: error.message,
          name: error.name,
          // Include Prisma error code if available
          code: (error as { code?: string }).code,
        }
        : { message: String(error) }

    return NextResponse.json(
      { error: 'Internal server error', action, details: errorDetails },
      { status: 500 }
    )
  }
}

// ─── Login Handler ──────────────────────────────────────────────

async function handleLogin(request: NextRequest) {
  // 1. Parse and validate request body
  let username = ''
  let password = ''

  try {
    const body = await request.json()
    username = (body.username || '').trim()
    password = body.password || ''
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body — expected JSON with username and password' },
      { status: 400 }
    )
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username and password are required' },
      { status: 400 }
    )
  }

  // 2. Ensure database connection (critical for Vercel cold starts)
  const connected = await ensureDbConnection(3)
  if (!connected) {
    console.error('Login failed: could not connect to database')
    return NextResponse.json(
      { error: 'Service temporarily unavailable — please try again in a moment' },
      { status: 503 }
    )
  }

  // 3. Find user by username or email (with retry for transient errors)
  let user
  try {
    user = await db.adminUser.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
    })
  } catch (dbError) {
    console.error('Login DB query failed:', dbError)

    // One retry for transient connection issues
    try {
      await ensureDbConnection(1)
      user = await db.adminUser.findFirst({
        where: {
          OR: [
            { username },
            { email: username },
          ],
        },
      })
    } catch (retryError) {
      console.error('Login DB query retry also failed:', retryError)
      return NextResponse.json(
        {
          error: 'Database error — please try again',
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 503 }
      )
    }
  }

  if (!user) {
    // Don't reveal whether user exists (security)
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // 4. Check if account is active
  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is disabled — contact administrator' },
      { status: 401 }
    )
  }

  // 5. Verify password
  let isValid = false
  try {
    isValid = await comparePassword(password, user.passwordHash)
  } catch (bcryptError) {
    console.error('Password comparison error:', bcryptError)
    return NextResponse.json(
      { error: 'Authentication error — please try again' },
      { status: 500 }
    )
  }

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // 6. Auto-upgrade: if password hash is old HMAC format, re-hash with bcrypt
  if (user.passwordHash.includes(':') && user.passwordHash.length < 100) {
    try {
      const newBcryptHash = await hashPassword(password)
      await db.adminUser.update({
        where: { id: user.id },
        data: { passwordHash: newBcryptHash },
      })
      console.log(`Password hash upgraded for user: ${user.username}`)
    } catch (upgradeError) {
      // Non-critical — don't block login
      console.error('Password hash upgrade failed (non-critical):', upgradeError)
    }
  }

  // 7. Generate JWT token
  let token: string
  try {
    token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })
  } catch (tokenError) {
    console.error('JWT sign error — is JWT_SECRET set?', tokenError)
    return NextResponse.json(
      {
        error: 'Token generation failed — server configuration error',
        hint: 'Ensure JWT_SECRET environment variable is set',
      },
      { status: 500 }
    )
  }

  // 8. Update last login (non-blocking, ignore errors)
  db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch((err) => console.error('Failed to update lastLoginAt:', err))

  // 9. Create activity log (non-blocking, ignore errors)
  db.activityLog.create({
    data: {
      userId: user.id,
      action: 'login',
      resource: 'auth',
      resourceId: user.id,
      details: JSON.stringify({ username: user.username }),
    },
  }).catch((err) => console.error('Failed to create activity log:', err))

  // 10. Return success — user data without password
  const { passwordHash: _ph, ...userWithoutPassword } = user

  return NextResponse.json({
    token,
    user: userWithoutPassword,
  })
}

// ─── Change Password Handler ────────────────────────────────────

async function handleChangePassword(request: NextRequest) {
  const currentUser = await getAuthUser(request)

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!currentUser.isActive) {
    return NextResponse.json(
      { error: 'Account is disabled' },
      { status: 401 }
    )
  }

  // Ensure DB connection
  const connected = await ensureDbConnection(2)
  if (!connected) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }

  let userId = ''
  let currentPassword = ''
  let newPassword = ''

  try {
    const body = await request.json()
    userId = body.userId || ''
    currentPassword = body.currentPassword || ''
    newPassword = body.newPassword || ''
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  if (!userId || !currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'userId, currentPassword, and newPassword are required' },
      { status: 400 }
    )
  }

  // Only allow users to change their own password (or superadmin)
  if (currentUser.id !== userId && currentUser.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'You can only change your own password' },
      { status: 403 }
    )
  }

  const user = await db.adminUser.findUnique({ where: { id: userId } })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.passwordHash)

  if (!isValid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    )
  }

  // Hash new password with bcrypt
  const newHash = await hashPassword(newPassword)

  // Update password
  await db.adminUser.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  })

  // Create activity log (non-blocking)
  db.activityLog.create({
    data: {
      userId: currentUser.id,
      action: 'update',
      resource: 'auth',
      resourceId: userId,
      details: JSON.stringify({ action: 'password_change' }),
    },
  }).catch((err) => console.error('Failed to create activity log:', err))

  return NextResponse.json({ message: 'Password changed successfully' })
}
