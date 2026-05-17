import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface LineupPlayer {
  name: string
  number?: number
  position?: string
  rating?: number
  photo?: string
}

/**
 * Normalize a name for matching: lowercase, strip accents, strip diacritics
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Try to find a matching player name using fuzzy matching.
 * The lineup may use short names (e.g., "Walker") while the Player table
 * uses full names (e.g., "Kyle Walker"). We match by checking if the
 * lineup name is a substring of the player name (normalized).
 */
function findBestMatch(
  lineupName: string,
  playerMap: Map<string, string>
): string | undefined {
  // 1. Exact match (case-insensitive)
  const normalizedLineup = normalizeName(lineupName)
  for (const [playerName, photoUrl] of playerMap) {
    if (normalizeName(playerName) === normalizedLineup) {
      return photoUrl
    }
  }

  // 2. Lineup name is a suffix/substring of player name
  // e.g., "Walker" matches "Kyle Walker", "Dias" matches "Rúben Dias"
  for (const [playerName, photoUrl] of playerMap) {
    const normalizedPlayer = normalizeName(playerName)
    if (normalizedPlayer.endsWith(normalizedLineup) || normalizedPlayer.includes(normalizedLineup)) {
      return photoUrl
    }
  }

  // 3. Player name ends with the lineup name's last word
  const lineupLastName = normalizedLineup.split(' ').pop()
  if (lineupLastName && lineupLastName.length >= 3) {
    for (const [playerName, photoUrl] of playerMap) {
      const playerLastName = normalizeName(playerName).split(' ').pop()
      if (playerLastName === lineupLastName) {
        return photoUrl
      }
    }
  }

  return undefined
}

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

    const lineups = await db.matchLineup.findMany({
      where: { matchId: fixtureId },
    })

    if (lineups.length === 0) {
      return NextResponse.json(
        { error: 'No lineup found for this match' },
        { status: 404 }
      )
    }

    const parsed = lineups.map((l) => ({
      ...l,
      startXI: JSON.parse(l.startXI) as LineupPlayer[],
      substitutes: JSON.parse(l.substitutes) as LineupPlayer[],
    }))

    // Fetch ALL players with photos in a single query (table is small enough)
    const allPlayers = await db.player.findMany({
      select: {
        name: true,
        photoUrl: true,
      },
    })

    // Build a lookup map: playerName -> photoUrl
    const playerPhotoMap = new Map<string, string>()
    for (const p of allPlayers) {
      if (p.photoUrl) {
        playerPhotoMap.set(p.name, p.photoUrl)
      }
    }

    // Enrich each player with photo field using fuzzy matching
    const enriched = parsed.map((l) => ({
      ...l,
      startXI: l.startXI.map((player: LineupPlayer) => ({
        ...player,
        photo: findBestMatch(player.name, playerPhotoMap) || '',
      })),
      substitutes: l.substitutes.map((player: LineupPlayer) => ({
        ...player,
        photo: findBestMatch(player.name, playerPhotoMap) || '',
      })),
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching lineup:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lineup' },
      { status: 500 }
    )
  }
}
