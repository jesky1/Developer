import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const player = await db.player.findUnique({
      where: { id },
      include: {
        stats: true,
        transfers: {
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const parsed = {
      ...player,
      stats: player.stats
        ? {
            ...player.stats,
            matchRatings: JSON.parse(player.stats.matchRatings),
          }
        : null,
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    )
  }
}
