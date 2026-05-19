import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league')

    const where: { league?: string } = {}
    if (league) {
      where.league = league
    }

    const scorers = await db.scorer.findMany({
      where,
      orderBy: {
        goals: 'desc',
      },
      take: 10,
    })

    const parsed = scorers.map((s) => ({
      id: s.id,
      name: s.name,
      team: s.team,
      teamLogo: s.teamLogo || undefined,
      goals: s.goals,
      assists: s.assists,
      matches: s.matches,
      league: s.league,
      photoUrl: s.photoUrl || undefined,
    }))

    return NextResponse.json(parsed)
  } catch {
    // Return empty array instead of 500 — prevents frontend from breaking
    return NextResponse.json([])
  }
}
