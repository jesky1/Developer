import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'Premier League'

    const standings = await db.standing.findMany({
      where: {
        league,
      },
      orderBy: {
        position: 'asc',
      },
    })

    const parsedStandings = standings.map((s) => ({
      position: s.position,
      team: s.team,
      teamLogo: s.teamLogo,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      gf: s.gf,
      ga: s.ga,
      gd: s.gd,
      points: s.points,
      form: JSON.parse(s.form),
      league: s.league,
    }))

    return NextResponse.json(parsedStandings)
  } catch (error) {
    console.error('Error fetching standings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    )
  }
}
