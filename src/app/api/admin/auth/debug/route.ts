import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Debug endpoint for diagnosing login issues on Vercel.
 * 
 * GET /api/admin/auth/debug
 * 
 * Returns:
 * - Database connection status
 * - DATABASE_URL format check (doesn't expose full URL)
 * - AdminUser table accessibility
 * - Admin user existence and hash format
 * - Password verification test
 * - JWT_SECRET check
 */
export async function GET(request: NextRequest) {
    const results: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
    }

    // 1. Check DATABASE_URL format
    const dbUrl = process.env.DATABASE_URL || ''
    results.databaseUrlFormat = {
        set: !!dbUrl,
        startsWithPostgres: dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'),
        prefix: dbUrl.substring(0, 30) + (dbUrl.length > 30 ? '...' : ''),
        includesNeon: dbUrl.includes('neon.tech'),
        includesFile: dbUrl.startsWith('file:'),
    }

    // 2. Check DIRECT_URL
    const directUrl = process.env.DIRECT_URL || ''
    results.directUrlFormat = {
        set: !!directUrl,
        startsWithPostgres: directUrl.startsWith('postgresql://') || directUrl.startsWith('postgres://'),
    }

    // 3. Check JWT_SECRET
    results.jwtSecret = {
        set: !!process.env.JWT_SECRET,
        length: process.env.JWT_SECRET?.length || 0,
    }

    // 4. Test database connection
    try {
        const connected = await ensureDbConnection(2)
        results.dbConnection = {
            success: connected,
            attempts: 2,
        }
    } catch (error) {
        results.dbConnection = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }

    // 5. Test AdminUser table query
    if (results.dbConnection && (results.dbConnection as { success: boolean }).success) {
        try {
            const adminCount = await db.adminUser.count()
            results.adminUserTable = {
                accessible: true,
                count: adminCount,
            }

            // 6. Check specific admin user
            const admin = await db.adminUser.findFirst({
                where: {
                    OR: [
                        { username: 'admin' },
                        { email: 'admin@goalzone.com' },
                    ],
                },
            })

            if (admin) {
                results.adminUser = {
                    found: true,
                    id: admin.id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role,
                    isActive: admin.isActive,
                    passwordHashFormat: {
                        isBcrypt: admin.passwordHash.startsWith('$2b$') || admin.passwordHash.startsWith('$2a$'),
                        prefix: admin.passwordHash.substring(0, 7),
                        length: admin.passwordHash.length,
                        rounds: admin.passwordHash.startsWith('$2b$') || admin.passwordHash.startsWith('$2a$')
                            ? parseInt(admin.passwordHash.substring(4, 6))
                            : 'unknown',
                    },
                    hasDisplayName: !!admin.displayName,
                    lastLoginAt: admin.lastLoginAt?.toISOString() || null,
                }

                // 7. Test password verification
                try {
                    const passwordMatch = await bcrypt.compare('admin123', admin.passwordHash)
                    results.passwordTest = {
                        success: true,
                        matches: passwordMatch,
                    }
                } catch (bcryptError) {
                    results.passwordTest = {
                        success: false,
                        error: bcryptError instanceof Error ? bcryptError.message : String(bcryptError),
                    }
                }
            } else {
                results.adminUser = {
                    found: false,
                    hint: 'Run /api/seed?secret=goalzone-seed-2024 to create admin user',
                }
            }
        } catch (error) {
            results.adminUserTable = {
                accessible: false,
                error: error instanceof Error ? error.message : String(error),
                errorCode: (error as { code?: string }).code,
            }
        }
    }

    return NextResponse.json(results, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
