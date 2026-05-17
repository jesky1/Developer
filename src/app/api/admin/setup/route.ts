import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, signToken, comparePassword } from '@/lib/auth'

// Default admin credentials for initial setup
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@goalzone.app',
  role: 'superadmin',
} as const

/**
 * Check if an error is a Prisma/DB configuration error
 */
function isDbConfigError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('url must start with the protocol') ||
      (msg.includes('prisma') && msg.includes('protocol')) ||
      (msg.includes('schema') && msg.includes('mismatch')) ||
      msg.includes("can't reach database server") ||
      msg.includes('p1001') || // Prisma: Can't reach database server
      msg.includes('p1000') || // Prisma: Authentication failed
      msg.includes('p1003')    // Prisma: Database does not exist
    )
  }
  return false
}

/**
 * Safely get the Prisma client, handling initialization errors.
 * Returns [prisma, error] tuple.
 */
async function getSafePrisma(): Promise<[any, string | null]> {
  try {
    const { db } = await import('@/lib/db')
    return [db, null]
  } catch (importError) {
    const errMsg = importError instanceof Error ? importError.message : String(importError)
    return [null, `Failed to import Prisma client: ${errMsg.substring(0, 200)}`]
  }
}

export async function GET() {
  try {
    const [db, importErr] = await getSafePrisma()

    if (importErr || !db) {
      return NextResponse.json({
        needsSetup: false,
        dbConnected: false,
        adminCount: 0,
        error: importErr || 'Prisma client not available',
        errorType: 'DB_IMPORT_ERROR',
      }, { status: 503 })
    }

    // Check database connectivity
    let dbConnected = false
    try {
      await db.$queryRaw`SELECT 1`
      dbConnected = true
    } catch (dbError) {
      const errMsg = dbError instanceof Error ? dbError.message : String(dbError)
      return NextResponse.json({
        needsSetup: false,
        dbConnected: false,
        adminCount: 0,
        error: `Database query failed: ${errMsg.substring(0, 300)}`,
        errorType: isDbConfigError(dbError) ? 'DB_CONFIG_ERROR' : 'DB_QUERY_ERROR',
        dbUrlProtocol: (process.env.DATABASE_URL || '').split(':')[0],
      }, { status: 503 })
    }

    // Check if setup is needed (no admin users exist)
    const adminCount = await db.adminUser.count()

    // Check if the default admin user exists
    const defaultAdmin = await db.adminUser.findUnique({
      where: { username: DEFAULT_ADMIN.username },
    })

    return NextResponse.json({
      needsSetup: adminCount === 0,
      dbConnected: true,
      adminCount,
      defaultAdminExists: !!defaultAdmin,
    })
  } catch (error) {
    console.error('Admin setup check error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        error: `Setup check failed: ${errMsg.substring(0, 300)}`,
        errorType: isDbConfigError(error) ? 'DB_CONFIG_ERROR' : 'INTERNAL_ERROR',
        needsSetup: false,
        dbConnected: false,
        dbUrlProtocol: (process.env.DATABASE_URL || '').split(':')[0],
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const [db, importErr] = await getSafePrisma()

    if (importErr || !db) {
      return NextResponse.json({
        error: importErr || 'Prisma client not available',
        errorType: 'DB_IMPORT_ERROR',
      }, { status: 503 })
    }

    // Check database connectivity first
    try {
      await db.$queryRaw`SELECT 1`
    } catch (dbError) {
      const errMsg = dbError instanceof Error ? dbError.message : String(dbError)
      return NextResponse.json({
        error: `Database not accessible: ${errMsg.substring(0, 300)}`,
        errorType: isDbConfigError(dbError) ? 'DB_CONFIG_ERROR' : 'DB_QUERY_ERROR',
        dbUrlProtocol: (process.env.DATABASE_URL || '').split(':')[0],
      }, { status: 503 })
    }

    // Parse request body (optional - if no body, use defaults)
    let body: Record<string, string> = {}
    try {
      body = await request.json()
    } catch {
      // No body provided, use defaults
    }

    const username = (body.username || DEFAULT_ADMIN.username).trim()
    const password = body.password || DEFAULT_ADMIN.password
    const email = (body.email || DEFAULT_ADMIN.email).trim().toLowerCase()
    const displayName = body.displayName || body.username || DEFAULT_ADMIN.username

    // Validate fields
    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if admin user with this username already exists
    const existingUser = await db.adminUser.findUnique({ where: { username } })

    if (existingUser) {
      // Idempotent: if admin already exists, verify password and return success
      const isValid = await comparePassword(password, existingUser.passwordHash)
      if (isValid) {
        const token = await signToken({
          userId: existingUser.id,
          username: existingUser.username,
          role: existingUser.role,
        })
        const { passwordHash: _ph, ...userWithoutPassword } = existingUser
        return NextResponse.json({
          message: 'Admin user already exists',
          token,
          user: userWithoutPassword,
        })
      }
      // Username exists but password doesn't match
      return NextResponse.json(
        { error: 'Admin user already exists with a different password' },
        { status: 409 }
      )
    }

    // Check for duplicate email
    const existingEmail = await db.adminUser.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    // Hash the password using HMAC-SHA256 from auth.ts
    const passwordHash = await hashPassword(password)

    // Create the superadmin user
    const user = await db.adminUser.create({
      data: {
        username,
        email,
        passwordHash,
        displayName,
        role: DEFAULT_ADMIN.role,
        isActive: true,
      },
    })

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    // Create activity log (non-blocking)
    db.activityLog.create({
      data: {
        userId: user.id,
        action: 'create',
        resource: 'admin_user',
        resourceId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role, setup: true }),
      },
    }).catch(() => { })

    // Return user data without password
    const { passwordHash: _ph, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: 'Admin user created successfully',
        token,
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Admin setup error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)

    if (isDbConfigError(error)) {
      return NextResponse.json({
        error: `Database config error: ${errMsg.substring(0, 300)}`,
        errorType: 'DB_CONFIG_ERROR',
        dbUrlProtocol: (process.env.DATABASE_URL || '').split(':')[0],
      }, { status: 503 })
    }

    return NextResponse.json(
      {
        error: `Setup failed: ${errMsg.substring(0, 300)}`,
        errorType: 'INTERNAL_ERROR',
        dbUrlProtocol: (process.env.DATABASE_URL || '').split(':')[0],
      },
      { status: 500 }
    )
  }
}
