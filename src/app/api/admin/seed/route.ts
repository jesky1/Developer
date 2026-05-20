import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin seed endpoint — delegates to the same logic as /api/seed
 * Kept for backward compatibility with admin panel
 */
export async function POST(request: NextRequest) {
    let seedSecret = ''

    try {
        const body = await request.json()
        seedSecret = body.secret || ''
    } catch {
        // Body parse failed
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

    return doAdminSeed()
}

export async function GET(request: NextRequest) {
    const seedSecret = request.nextUrl.searchParams.get('secret') || ''
    const expectedSecret = process.env.SEED_SECRET || 'goalzone-seed-2024'

    if (!seedSecret) {
        return NextResponse.json({
            message: 'GOALZONE Admin Seed Endpoint (also available at /api/seed)',
            usage: {
                get: 'GET /api/admin/seed?secret=goalzone-seed-2024',
                post: 'POST /api/admin/seed with body {"secret":"goalzone-seed-2024"}',
                header: 'POST /api/admin/seed with header x-seed-secret: goalzone-seed-2024',
            },
            usingCustomSecret: !!process.env.SEED_SECRET,
        })
    }

    if (seedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Invalid seed secret.' }, { status: 403 })
    }

    return doAdminSeed()
}

async function doAdminSeed() {
    try {
        const { db } = await import('@/lib/db')
        const bcrypt = await import('bcryptjs')

        const results: string[] = []

        // ===== 1. Create default admin user =====
        const existingAdmin = await db.adminUser.findFirst({
            where: {
                OR: [
                    { username: 'admin' },
                    { email: 'admin@goalzone.com' },
                ],
            },
        })

        const passwordHash = await bcrypt.hash('admin123', 12)

        if (!existingAdmin) {
            await db.adminUser.create({
                data: {
                    username: 'admin',
                    email: 'admin@goalzone.com',
                    passwordHash,
                    displayName: 'Admin',
                    role: 'superadmin',
                    isActive: true,
                },
            })
            results.push('Created admin user (admin@goalzone.com / admin123 / superadmin)')
        } else {
            await db.adminUser.update({
                where: { id: existingAdmin.id },
                data: {
                    passwordHash,
                    email: 'admin@goalzone.com',
                    role: 'superadmin',
                    isActive: true,
                },
            })
            results.push('Admin user already exists — password hash updated, role set to superadmin')
        }

        // ===== 2. Create default site settings =====
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
                username: 'admin',
                email: 'admin@goalzone.com',
                password: 'admin123',
                role: 'superadmin',
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
