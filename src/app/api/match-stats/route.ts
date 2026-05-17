import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixtureId query parameter is required' },
        { status: 400 }
      )
    }

    const stats = await db.matchStats.findUnique({
      where: { matchId: fixtureId },
    })

    if (!stats) {
      return NextResponse.json(
        { error: 'No stats found for this match' },
        { status: 404 }
      )
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching match stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch match stats' },
      { status: 500 }
    )
  }
}
