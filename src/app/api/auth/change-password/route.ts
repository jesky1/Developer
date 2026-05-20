import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbConnection } from '@/lib/db'
import { comparePassword, hashPassword, verifyUserToken } from '@/lib/user-auth'

/**
 * POST /api/auth/change-password
 *
 * Change password for regular (non-admin) users.
 * Requires Bearer token in Authorization header.
 *
 * Body: { currentPassword, newPassword }
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Get and verify auth token
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7)
        let payload

        try {
            payload = await verifyUserToken(token)
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            )
        }

        // 2. Parse request body
        let currentPassword = ''
        let newPassword = ''

        try {
            const body = await request.json()
            currentPassword = body.currentPassword || ''
            newPassword = body.newPassword || ''
        } catch {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            )
        }

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            )
        }

        // 3. Validate new password strength
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'New password must be at least 8 characters' },
                { status: 400 }
            )
        }

        if (!/[A-Z]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'New password must contain at least one uppercase letter' },
                { status: 400 }
            )
        }

        if (!/[a-z]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'New password must contain at least one lowercase letter' },
                { status: 400 }
            )
        }

        if (!/[0-9]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'New password must contain at least one number' },
                { status: 400 }
            )
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: 'New password must be different from current password' },
                { status: 400 }
            )
        }

        // 4. Ensure database connection
        const connected = await ensureDbConnection(3)
        if (!connected) {
            return NextResponse.json(
                { error: 'Service temporarily unavailable — please try again' },
                { status: 503 }
            )
        }

        // 5. Find user by ID from token
        const user = await db.user.findUnique({
            where: { id: payload.userId },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // 6. Check if user has a password (OAuth users may not)
        if (!user.passwordHash) {
            return NextResponse.json(
                { error: 'This account uses OAuth login and does not have a password set. Please contact support.' },
                { status: 400 }
            )
        }

        // 7. Verify current password
        const isValid = await comparePassword(currentPassword, user.passwordHash)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            )
        }

        // 8. Hash new password and update
        const newHash = await hashPassword(newPassword)

        await db.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
        })

        return NextResponse.json({
            message: 'Password changed successfully',
        })
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json(
            {
                error: 'Failed to change password',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
