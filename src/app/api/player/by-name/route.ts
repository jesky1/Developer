import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Normalize a name for matching: lowercase, strip accents, strip diacritics
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required query parameter: name' },
        { status: 400 }
      )
    }

    const normalizedName = normalizeName(name)

    // Fetch all players with their stats and transfers.
    // In practice the player table is small enough for this to be fine.
    const allPlayers = await db.player.findMany({
      include: {
        stats: true,
        transfers: {
          orderBy: { date: 'desc' },
        },
      },
    })

    // Strategy 1: Exact match (case + accent insensitive)
    let player = allPlayers.find((p) => {
      return normalizeName(p.name) === normalizedName
    })

    // Strategy 2: Lineup name is a suffix/substring of player name
    // e.g., "Walker" matches "Kyle Walker", "Dias" matches "Rúben Dias"
    if (!player) {
      player = allPlayers.find((p) => {
        const pNormalized = normalizeName(p.name)
        return pNormalized.endsWith(normalizedName) || pNormalized.includes(normalizedName)
      })
    }

    // Strategy 3: Last name match
    if (!player) {
      const queryLastName = normalizedName.split(' ').pop()
      if (queryLastName && queryLastName.length >= 3) {
        player = allPlayers.find((p) => {
          const playerLastName = normalizeName(p.name).split(' ').pop()
          return playerLastName === queryLastName
        })
      }
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields in stats
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
    console.error('Error fetching player by name:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    )
  }
}
