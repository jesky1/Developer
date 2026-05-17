import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Security: only allow setup if no admin users exist yet
    const adminCount = await db.adminUser.count()

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup has already been completed. Admin users already exist.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, email, password, displayName } = body

    // Validate required fields
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username is required and must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 1) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate username or email
    const existingUser = await db.adminUser.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim().toLowerCase() },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.username === username.trim() ? 'Username already exists' : 'Email already exists' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Create the superadmin user
    const user = await db.adminUser.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        displayName: displayName.trim(),
        role: 'superadmin',
        isActive: true,
      },
    })

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    // Create activity log
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'create',
        resource: 'admin_user',
        resourceId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role, setup: true }),
      },
    })

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check if setup is needed (no admin users exist)
    const adminCount = await db.adminUser.count()

    return NextResponse.json({
      needsSetup: adminCount === 0,
      adminCount,
    })
  } catch (error) {
    console.error('Admin setup check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
