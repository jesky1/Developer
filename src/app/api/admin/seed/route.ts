import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

// Seed endpoint to create the default admin user in production
// This should be called once after deployment to initialize the database
// Protected by SEED_SECRET env var to prevent unauthorized seeding
export async function POST(request: NextRequest) {
    try {
        // Verify seed secret
        const body = await request.json().catch(() => ({}))
        const seedSecret = body.secret || request.nextUrl.searchParams.get('secret')
        const expectedSecret = process.env.SEED_SECRET || 'goalzone-seed-2024'

        if (seedSecret !== expectedSecret) {
            return NextResponse.json(
                { error: 'Invalid seed secret. Set SEED_SECRET env var or use default.' },
                { status: 403 }
            )
        }

        // Dynamic import for resilience
        const { db } = await import('@/lib/db')

        const results: string[] = []

        // 1. Create default admin user
        const existingAdmin = await db.adminUser.findUnique({ where: { username: 'admin' } })
        if (!existingAdmin) {
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.create({
                data: {
                    username: 'admin',
                    email: 'admin@goalzone.app',
                    passwordHash,
                    displayName: 'Super Admin',
                    role: 'superadmin',
                    isActive: true,
                },
            })
            results.push('Created admin user (admin/admin123)')
        } else {
            // Update password hash to ensure it matches current HMAC key
            const passwordHash = await hashPassword('admin123')
            await db.adminUser.update({
                where: { id: existingAdmin.id },
                data: { passwordHash },
            })
            results.push('Admin user already exists — password hash updated')
        }

        // 2. Create sample ad units
        const adUnits = [
            { name: 'Homepage Banner', slotId: 'home-banner-001', placement: 'header', adType: 'display' },
            { name: 'Article Top Banner', slotId: 'article-top-001', placement: 'article_top', adType: 'display' },
            { name: 'Sidebar Rectangle', slotId: 'sidebar-rect-001', placement: 'sidebar', adType: 'display' },
        ]

        let adCount = 0
        for (const unit of adUnits) {
            const existing = await db.adUnit.findUnique({ where: { slotId: unit.slotId } })
            if (!existing) {
                await db.adUnit.create({
                    data: {
                        ...unit,
                        impressions: Math.floor(Math.random() * 5000) + 1000,
                        clicks: Math.floor(Math.random() * 100) + 20,
                        revenue: Math.round((Math.random() * 30 + 5) * 100) / 100,
                    },
                })
                adCount++
            }
        }
        if (adCount > 0) results.push(`Created ${adCount} ad units`)

        // 3. Create site settings
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
                password: 'admin123',
                note: 'Change the default password after first login!',
            },
        })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json(
            { error: 'Seed failed — database may not be configured', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
