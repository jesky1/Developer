import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Helper: find a superadmin user ID for activity logging
async function getAdminUserId(): Promise<string> {
  const superadmin = await db.adminUser.findFirst({
    where: { role: 'superadmin', isActive: true },
  })
  if (superadmin) return superadmin.id
  const anyAdmin = await db.adminUser.findFirst()
  return anyAdmin?.id ?? 'system'
}

// GET: List all admin users with their activity counts
export async function GET() {
  try {
    const users = await db.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { activities: true },
        },
      },
    })

    const result = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activityCount: user._count.activities,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}

// POST: Create a new admin user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, displayName, role } = body

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      )
    }

    // Check for duplicate username
    const existingUsername = await db.adminUser.findUnique({
      where: { username },
    })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      )
    }

    // Check for duplicate email
    const existingEmail = await db.adminUser.findUnique({
      where: { email },
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    const user = await db.adminUser.create({
      data: {
        username,
        email,
        displayName: displayName ?? '',
        role: role ?? 'editor',
      },
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'create',
        resource: 'user',
        resourceId: user.id,
        details: JSON.stringify({
          username: user.username,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        }),
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
