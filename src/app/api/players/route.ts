import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (name) {
      // Search by name with accent-insensitive matching
      // SQLite doesn't support mode: insensitive, so we do client-side filtering
      const allPlayers = await db.player.findMany({ take: 200 })
      const normalizedName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const filtered = allPlayers.filter((p) =>
        p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedName)
      )
      return NextResponse.json(filtered.slice(0, 5))
    }

    // Return all players (limited)
    const players = await db.player.findMany({
      take: 100,
      orderBy: { rating: 'desc' },
    })
    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
