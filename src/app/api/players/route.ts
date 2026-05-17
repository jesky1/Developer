import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const position = searchParams.get('position')
    const league = searchParams.get('league')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (name) {
      // Search by name with accent-insensitive matching
      // SQLite doesn't support mode: insensitive, so we do client-side filtering
      const allPlayers = await db.player.findMany({
        take: 200,
        include: { stats: true },
      })
      const normalizedName = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const filtered = allPlayers.filter((p) =>
        p.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalizedName)
      )
      const results = filtered.slice(0, 5).map((p) => ({
        ...p,
        stats: p.stats
          ? { ...p.stats, matchRatings: JSON.parse(p.stats.matchRatings) }
          : null,
      }))
      return NextResponse.json(results)
    }

    // Build where clause for filters
    const where: Record<string, unknown> = {}
    if (position) {
      where.position = position.toUpperCase()
    }
    if (league) {
      where.currentClub = { contains: league }
    }

    // Return all players with stats (limited)
    const players = await db.player.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { rating: 'desc' },
      include: { stats: true },
    })

    const results = players.map((p) => ({
      ...p,
      stats: p.stats
        ? { ...p.stats, matchRatings: JSON.parse(p.stats.matchRatings) }
        : null,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
