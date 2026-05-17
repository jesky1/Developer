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

// GET: List all settings (optionally filter by ?category=)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}

    const settings = await db.siteSetting.findMany({
      where,
      orderBy: { category: 'asc' },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PATCH: Update multiple settings at once
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { settings } = body as { settings: { key: string; value: string }[] }

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { error: 'Settings array is required and must not be empty' },
        { status: 400 }
      )
    }

    const adminId = await getAdminUserId()
    const updated: { key: string; value: string }[] = []

    for (const setting of settings) {
      if (!setting.key) continue

      const existing = await db.siteSetting.findUnique({
        where: { key: setting.key },
      })

      if (existing) {
        const oldValue = existing.value
        await db.siteSetting.update({
          where: { key: setting.key },
          data: { value: setting.value },
        })

        // Create activity log for each changed setting
        if (oldValue !== setting.value) {
          await db.activityLog.create({
            data: {
              userId: adminId,
              action: 'update',
              resource: 'setting',
              resourceId: existing.id,
              details: JSON.stringify({
                key: setting.key,
                oldValue,
                newValue: setting.value,
              }),
            },
          })
        }

        updated.push({ key: setting.key, value: setting.value })
      }
    }

    return NextResponse.json({
      message: `Updated ${updated.length} setting(s)`,
      updated,
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
