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

// GET: List matches with pagination and filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const status = searchParams.get('status')
    const league = searchParams.get('league')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (league) where.league = league

    const [matches, total] = await Promise.all([
      db.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.match.count({ where }),
    ])

    // Parse JSON fields
    const parsed = matches.map((match) => {
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
      return { ...match, events, homeForm, awayForm }
    })

    return NextResponse.json({
      data: parsed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

// POST: Create a new match
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      homeTeam,
      awayTeam,
      league,
      status,
      homeScore,
      awayScore,
      minute,
      leagueLogo,
      homeLogo,
      awayLogo,
      stadium,
      kickoff,
      isHot,
      events,
      homeForm,
      awayForm,
    } = body

    if (!homeTeam || !awayTeam || !league) {
      return NextResponse.json(
        { error: 'homeTeam, awayTeam, and league are required' },
        { status: 400 }
      )
    }

    const match = await db.match.create({
      data: {
        homeTeam,
        awayTeam,
        league,
        status: status ?? 'UPCOMING',
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        minute: minute ?? 0,
        leagueLogo: leagueLogo ?? '',
        homeLogo: homeLogo ?? '',
        awayLogo: awayLogo ?? '',
        stadium: stadium ?? '',
        kickoff: kickoff ?? '',
        isHot: isHot ?? false,
        events: events ? JSON.stringify(events) : '[]',
        homeForm: homeForm ? JSON.stringify(homeForm) : '[]',
        awayForm: awayForm ? JSON.stringify(awayForm) : '[]',
      },
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'create',
        resource: 'match',
        resourceId: match.id,
        details: JSON.stringify({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          status: match.status,
        }),
      },
    })

    // Parse JSON fields for response
    let parsedEvents: unknown[] = []
    let parsedHomeForm: string[] = []
    let parsedAwayForm: string[] = []
    try {
      parsedEvents = JSON.parse(match.events)
    } catch {
      parsedEvents = []
    }
    try {
      parsedHomeForm = JSON.parse(match.homeForm)
    } catch {
      parsedHomeForm = []
    }
    try {
      parsedAwayForm = JSON.parse(match.awayForm)
    } catch {
      parsedAwayForm = []
    }

    return NextResponse.json(
      { ...match, events: parsedEvents, homeForm: parsedHomeForm, awayForm: parsedAwayForm },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    )
  }
}
