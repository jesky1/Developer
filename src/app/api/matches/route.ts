import { db, ensureDbConnection } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type MatchStatus = 'LIVE' | 'HT' | 'UPCOMING' | 'FT'

const STATUS_ORDER: Record<MatchStatus, number> = {
  LIVE: 0,
  HT: 1,
  UPCOMING: 2,
  FT: 3,
}

function safeJSONParse(str: string, fallback: unknown = []) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure DB connection (critical for serverless)
    const connected = await ensureDbConnection(2)
    if (!connected) {
      return NextResponse.json(
        { error: 'Database temporarily unavailable' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league')
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200)
    const offset = Number(searchParams.get('offset') || 0)

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
      take: limit,
      skip: offset,
    })

    // Sort: LIVE first, then HT, then UPCOMING, then FT
    const sorted = matches.sort((a, b) => {
      const orderA = STATUS_ORDER[a.status as MatchStatus] ?? 99
      const orderB = STATUS_ORDER[b.status as MatchStatus] ?? 99
      return orderA - orderB
    })

    // Parse JSON string fields with safe parsing
    const parsed = sorted.map((m) => ({
      ...m,
      events: safeJSONParse(m.events, []),
      homeForm: safeJSONParse(m.homeForm, []),
      awayForm: safeJSONParse(m.awayForm, []),
      poll: m.poll
        ? {
          homeVotes: m.poll.homeVotes,
          drawVotes: m.poll.drawVotes,
          awayVotes: m.poll.awayVotes,
        }
        : null,
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}
