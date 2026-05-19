import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Error fetching scorers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scorers' },
      { status: 500 }
    )
  }
}
