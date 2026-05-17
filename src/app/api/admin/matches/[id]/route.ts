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

// GET: Get single match
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const match = await db.match.findUnique({
      where: { id },
      include: { poll: true },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    let events: unknown[] = []
    let homeForm: string[] = []
    let awayForm: string[] = []
    try {
      events = JSON.parse(match.events)
    } catch {
      events = []
    }
    try {
      homeForm = JSON.parse(match.homeForm)
    } catch {
      homeForm = []
    }
    try {
      awayForm = JSON.parse(match.awayForm)
    } catch {
      awayForm = []
    }

    return NextResponse.json({
      ...match,
      events,
      homeForm,
      awayForm,
    })
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    )
  }
}

// PATCH: Update match
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.match.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    const allowedFields = [
      'homeTeam', 'awayTeam', 'league', 'status', 'homeScore',
      'awayScore', 'minute', 'leagueLogo', 'homeLogo', 'awayLogo',
      'stadium', 'kickoff', 'isHot',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]
      }
    }

    // Handle JSON fields
    if (body.events !== undefined) {
      data.events = Array.isArray(body.events) ? JSON.stringify(body.events) : body.events
    }
    if (body.homeForm !== undefined) {
      data.homeForm = Array.isArray(body.homeForm) ? JSON.stringify(body.homeForm) : body.homeForm
    }
    if (body.awayForm !== undefined) {
      data.awayForm = Array.isArray(body.awayForm) ? JSON.stringify(body.awayForm) : body.awayForm
    }

    const match = await db.match.update({
      where: { id },
      data,
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'update',
        resource: 'match',
        resourceId: id,
        details: JSON.stringify({
          updatedFields: Object.keys(data),
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        }),
      },
    })

    // Parse JSON fields for response
    let events: unknown[] = []
    let homeForm: string[] = []
    let awayForm: string[] = []
    try {
      events = JSON.parse(match.events)
    } catch {
      events = []
    }
    try {
      homeForm = JSON.parse(match.homeForm)
    } catch {
      homeForm = []
    }
    try {
      awayForm = JSON.parse(match.awayForm)
    } catch {
      awayForm = []
    }

    return NextResponse.json({
      ...match,
      events,
      homeForm,
      awayForm,
    })
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    )
  }
}

// DELETE: Delete match (and its related poll via cascade)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.match.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Create activity log before deletion
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'delete',
        resource: 'match',
        resourceId: id,
        details: JSON.stringify({
          homeTeam: existing.homeTeam,
          awayTeam: existing.awayTeam,
          league: existing.league,
          status: existing.status,
        }),
      },
    })

    // Poll will be cascade deleted
    await db.match.delete({ where: { id } })

    return NextResponse.json({ message: 'Match deleted successfully' })
  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: 'Failed to delete match' },
      { status: 500 }
    )
  }
}
