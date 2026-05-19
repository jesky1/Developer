import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
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
  } catch {
    // Return empty array instead of 500 — prevents frontend from breaking
    return NextResponse.json([])
  }
}
