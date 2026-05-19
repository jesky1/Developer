import { NextRequest, NextResponse } from 'next/server'

type MatchStatus = 'LIVE' | 'HT' | 'UPCOMING' | 'FT'

const STATUS_ORDER: Record<MatchStatus, number> = {
  LIVE: 0,
  HT: 1,
  UPCOMING: 2,
  FT: 3,
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league')
    const status = searchParams.get('status')

    const where: {
      league?: string
      status?: string
    } = {}

    if (league) {
      where.league = league
    }
    if (status) {
      where.status = status
    }

    const matches = await db.match.findMany({
      where,
      include: {
        poll: true,
      },
    })

    // Sort: LIVE first, then HT, then UPCOMING, then FT
    const sorted = matches.sort((a, b) => {
      const orderA = STATUS_ORDER[a.status as MatchStatus] ?? 99
      const orderB = STATUS_ORDER[b.status as MatchStatus] ?? 99
      return orderA - orderB
    })

    // Parse JSON string fields
    const parsed = sorted.map((m) => ({
      ...m,
      events: JSON.parse(m.events),
      homeForm: JSON.parse(m.homeForm),
      awayForm: JSON.parse(m.awayForm),
      poll: m.poll
        ? {
          homeVotes: m.poll.homeVotes,
          drawVotes: m.poll.drawVotes,
          awayVotes: m.poll.awayVotes,
        }
        : null,
    }))

    return NextResponse.json(parsed)
  } catch {
    // Return empty array instead of 500 — prevents frontend from breaking
    return NextResponse.json([])
  }
}
