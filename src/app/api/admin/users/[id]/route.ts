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

// GET: Get single admin user with recent activities
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.adminUser.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching admin user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin user' },
      { status: 500 }
    )
  }
}

// PATCH: Update admin user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { displayName, role, isActive, email } = body

    const existingUser = await db.adminUser.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check email uniqueness if changing
    if (email && email !== existingUser.email) {
      const emailTaken = await db.adminUser.findUnique({ where: { email } })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (displayName !== undefined) data.displayName = displayName
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive
    if (email !== undefined) data.email = email

    const user = await db.adminUser.update({
      where: { id },
      data,
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'update',
        resource: 'user',
        resourceId: id,
        details: JSON.stringify(data),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating admin user:', error)
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    )
  }
}

// DELETE: Delete admin user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingUser = await db.adminUser.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create activity log before deletion (cascade will remove their own activities)
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'delete',
        resource: 'user',
        resourceId: id,
        details: JSON.stringify({
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
        }),
      },
    })

    await db.adminUser.delete({ where: { id } })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    )
  }
}
