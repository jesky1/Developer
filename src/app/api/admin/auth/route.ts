import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken, comparePassword, hashPassword, getAuthUser } from '@/lib/auth'

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'login'

  try {
    switch (action) {
      case 'login': {
        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
          return NextResponse.json(
            { error: 'Username and password are required' },
            { status: 400 }
          )
        }

        const user = await db.adminUser.findUnique({ where: { username } })

        if (!user) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          )
        }

        if (!user.isActive) {
          return NextResponse.json(
            { error: 'Account is disabled' },
            { status: 401 }
          )
        }

        const isValid = await comparePassword(password, user.passwordHash)

        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          )
        }

        // Generate JWT
        const token = await signToken({
          userId: user.id,
          username: user.username,
          role: user.role,
        })

        // Update last login (non-blocking)
        db.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => { })

        // Create activity log (non-blocking)
        db.activityLog.create({
          data: {
            userId: user.id,
            action: 'login',
            resource: 'auth',
            resourceId: user.id,
            details: JSON.stringify({ username: user.username }),
          },
        }).catch(() => { })

        // Return user data without password
        const { passwordHash: _ph, ...userWithoutPassword } = user

        return NextResponse.json({
          token,
          user: userWithoutPassword,
        })
      }

      case 'change-password': {
        const currentUser = await getAuthUser(request)

        if (!currentUser) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        const body = await request.json()
        const { userId, currentPassword, newPassword } = body

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

        // Hash new password
        const newHash = await hashPassword(newPassword)

        // Update password
        await db.adminUser.update({
          where: { id: userId },
          data: { passwordHash: newHash },
        })

        // Create activity log
        await db.activityLog.create({
          data: {
            userId: currentUser.id,
            action: 'update',
            resource: 'auth',
            resourceId: userId,
            details: JSON.stringify({ action: 'password_change' }),
          },
        })

        return NextResponse.json({ message: 'Password changed successfully' })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auth POST (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
