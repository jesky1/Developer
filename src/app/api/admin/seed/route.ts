import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

// Seed endpoint to create the default admin user in production
// Protected by SEED_SECRET env var to prevent unauthorized seeding
export async function POST(request: NextRequest) {
    try {
        // Verify seed secret - check body JSON, query param, or x-seed-secret header
        let seedSecret = ''
        try {
            const body = await request.json()
            seedSecret = body.secret || ''
        } catch {
            // Body parse failed, try other methods
        }

        if (!seedSecret) {
            seedSecret = request.nextUrl.searchParams.get('secret') || ''
        }
        if (!seedSecret) {
            seedSecret = request.headers.get('x-seed-secret') || ''
        }

        const expectedSecret = process.env.SEED_SECRET || 'goalzone-seed-2024'

        if (!seedSecret) {
            return NextResponse.json(
                {
                    error: 'Seed secret is required.',
                    hint: 'Pass secret via JSON body {"secret":"..."}, query param ?secret=..., or header x-seed-secret.',
                    defaultSecret: !process.env.SEED_SECRET ? 'goalzone-seed-2024' : undefined,
                    usingCustomSecret: !!process.env.SEED_SECRET,
                },
                { status: 400 }
            )
        }

        if (seedSecret !== expectedSecret) {
            return NextResponse.json(
                {
                    error: 'Invalid seed secret.',
                    hint: process.env.SEED_SECRET
                        ? 'SEED_SECRET env var is set — use that value.'
                        : 'No SEED_SECRET env var set — the default is "goalzone-seed-2024".',
                },
                { status: 403 }
            )
        }

        // Dynamic import for resilience
        const { db } = await import('@/lib/db')

        const results: string[] = []

        // 1. Create default admin user (bcrypt hash)
        const existingAdmin = await db.adminUser.findFirst({
            where: {
                OR: [
                    { username: 'admin' },
                    { email: 'admin@goalzone.com' },
                ],
            },
        })

        if (!existingAdmin) {
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.create({
                data: {
                    username: 'admin',
                    email: 'admin@goalzone.com',
                    passwordHash,
                    displayName: 'Admin',
                    role: 'admin',
                    isActive: true,
                },
            })
            results.push('Created admin user (admin@goalzone.com / admin123)')
        } else {
            // Update password hash to bcrypt + ensure active
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.update({
                where: { id: existingAdmin.id },
                data: { passwordHash, isActive: true, role: 'admin', email: 'admin@goalzone.com' },
            })
            results.push('Admin user already exists — password hash updated to bcrypt & activated')
        }

        // 2. Create site settings
        const settings = [
            { key: 'site_name', value: 'GOALZONE', category: 'general', description: 'Site name', isPublic: true },
            { key: 'site_description', value: 'Live Football Scores & News', category: 'general', description: 'Site description', isPublic: true },
            { key: 'maintenance_mode', value: 'false', category: 'features', description: 'Maintenance mode', isPublic: false },
        ]

        let settingsCount = 0
        for (const setting of settings) {
            const existing = await db.siteSetting.findUnique({ where: { key: setting.key } })
            if (!existing) {
                await db.siteSetting.create({ data: setting })
                settingsCount++
            }
        }
        if (settingsCount > 0) results.push(`Created ${settingsCount} site settings`)

        return NextResponse.json({
            message: 'Database seeded successfully',
            results,
            credentials: {
                email: 'admin@goalzone.com',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                note: 'Change the default password after first login!',
            },
        })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json(
            {
                error: 'Seed failed — database may not be configured',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}

// GET for easy browser testing
export async function GET(request: NextRequest) {
    const seedSecret = request.nextUrl.searchParams.get('secret') || ''
    const expectedSecret = process.env.SEED_SECRET || 'goalzone-seed-2024'

    if (!seedSecret) {
        return NextResponse.json({
            message: 'GOALZONE Database Seed Endpoint',
            usage: {
                post: 'POST /api/admin/seed with body {"secret":"goalzone-seed-2024"}',
                get: 'GET /api/admin/seed?secret=goalzone-seed-2024',
                header: 'POST /api/admin/seed with header x-seed-secret: goalzone-seed-2024',
            },
            usingCustomSecret: !!process.env.SEED_SECRET,
        })
    }

    if (seedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Invalid seed secret.' }, { status: 403 })
    }

    try {
        const { db } = await import('@/lib/db')
        const { hashPassword } = await import('@/lib/auth')
        const results: string[] = []

        const existingAdmin = await db.adminUser.findFirst({
            where: {
                OR: [{ username: 'admin' }, { email: 'admin@goalzone.com' }],
            },
        })

        if (!existingAdmin) {
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.create({
                data: {
                    username: 'admin',
                    email: 'admin@goalzone.com',
                    passwordHash,
                    displayName: 'Admin',
                    role: 'admin',
                    isActive: true,
                },
            })
            results.push('Created admin user (admin@goalzone.com / admin123)')
        } else {
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.update({
                where: { id: existingAdmin.id },
                data: { passwordHash, isActive: true, role: 'admin', email: 'admin@goalzone.com' },
            })
            results.push('Admin user already exists — password hash updated & activated')
        }

        return NextResponse.json({
            message: 'Database seeded successfully',
            results,
            credentials: {
                email: 'admin@goalzone.com',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
            },
        })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json(
            { error: 'Seed failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
