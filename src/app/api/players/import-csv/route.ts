import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Parse semicolon-separated CSV from API-Football
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function toInt(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : n
}

function toFloat(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

function mapPosition(apiPosition: string): string {
  const map: Record<string, string> = {
    Attacker: 'FW',
    Midfielder: 'MF',
    Defender: 'DF',
    Goalkeeper: 'GK',
  }
  return map[apiPosition] || apiPosition
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvData } = body // Raw CSV string content

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'csvData (string) is required' },
        { status: 400 }
      )
    }

    const lines = csvData.split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have header + data rows' },
        { status: 400 }
      )
    }

    const headers = parseCsvLine(lines[0])
    const rows = lines.slice(1).map((l) => parseCsvLine(l))

    const headerMap: Record<string, number> = {}
    headers.forEach((h, i) => {
      headerMap[h.trim()] = i
    })

    function getVal(row: string[], header: string): string {
      const idx = headerMap[header]
      return idx !== undefined && idx < row.length ? row[idx] : ''
    }

    let created = 0
    let updated = 0
    let statsCreated = 0
    let statsUpdated = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        const apiId = toInt(getVal(row, 'Id'))
        const name = getVal(row, 'Name')
        if (!name) continue

        // Upsert player by apiFootballId
        const existingPlayer = await db.player.findFirst({
          where: { apiFootballId: apiId || -1 },
        })
        let playerId: string

        const playerData = {
          apiFootballId: apiId,
          name,
          firstName: getVal(row, 'Firstname'),
          lastName: getVal(row, 'Lastname'),
          age: toInt(getVal(row, 'Age')),
          birthDate: getVal(row, 'Birth date'),
          birthPlace: getVal(row, 'Birth place'),
          birthCountry: getVal(row, 'Birth country'),
          nationality: getVal(row, 'Nationality'),
          height: getVal(row, 'Height'),
          weight: getVal(row, 'Weight'),
          injured: getVal(row, 'Injured').toLowerCase() === 'true',
          photoUrl: getVal(row, 'Photo'),
          position: mapPosition(getVal(row, 'Games position')),
          currentClub: getVal(row, 'Team name'),
          teamId: toInt(getVal(row, 'Team id')),
          teamLogo: getVal(row, 'Team logo'),
          clubLogo: getVal(row, 'Team logo'),
          leagueId: toInt(getVal(row, 'League id')),
          rating: toFloat(getVal(row, 'Games rating')),
          shirtNumber: toInt(getVal(row, 'Games number')),
        }

        if (existingPlayer) {
          await db.player.update({
            where: { id: existingPlayer.id },
            data: playerData,
          })
          playerId = existingPlayer.id
          updated++
        } else {
          const newPlayer = await db.player.create({ data: playerData })
          playerId = newPlayer.id
          created++
        }

        // Upsert stats
        const existingStats = await db.playerStats.findUnique({
          where: { playerId },
        })

        const statsData = {
          totalMatches: toInt(getVal(row, 'Games appearences')),
          lineups: toInt(getVal(row, 'Games lineups')),
          minutes: toInt(getVal(row, 'Games minutes')),
          goals: toInt(getVal(row, 'Goals total')),
          goalsConceded: toInt(getVal(row, 'Goals conceded')),
          assists: toInt(getVal(row, 'Goals assists')),
          saves: toInt(getVal(row, 'Goals saves')),
          shots: toInt(getVal(row, 'Shots total')),
          shotsOnTarget: toInt(getVal(row, 'Shots on')),
          passesTotal: toInt(getVal(row, 'Passes total')),
          passesKey: toInt(getVal(row, 'Passes key')),
          passingAccuracy: toFloat(getVal(row, 'Passes accuracy')),
          tackles: toInt(getVal(row, 'Tackles total')),
          tacklesBlocks: toInt(getVal(row, 'Tackles blocks')),
          interceptions: toInt(getVal(row, 'Tackles interceptions')),
          duelsTotal: toInt(getVal(row, 'Duels total')),
          duelsWon: toInt(getVal(row, 'Duels won')),
          dribblesAttempts: toInt(getVal(row, 'Dribbles attempts')),
          dribblesSuccess: toInt(getVal(row, 'Dribbles success')),
          dribblesPast: toInt(getVal(row, 'Dribbles past')),
          foulsDrawn: toInt(getVal(row, 'Fouls drawn')),
          foulsCommitted: toInt(getVal(row, 'Fouls committed')),
          fouls: toInt(getVal(row, 'Fouls committed')),
          yellowCards: toInt(getVal(row, 'Cards yellow')),
          yellowRedCards: toInt(getVal(row, 'Cards yellowred')),
          redCards: toInt(getVal(row, 'Cards red')),
          penaltyWon: toInt(getVal(row, 'Penalty won')),
          penaltyCommitted: toInt(getVal(row, 'Penalty commited')),
          penaltyScored: toInt(getVal(row, 'Penalty scored')),
          penaltyMissed: toInt(getVal(row, 'Penalty missed')),
          penaltySaved: toInt(getVal(row, 'Penalty saved')),
          isCaptain: getVal(row, 'Games captain').toLowerCase() === 'true',
          substitutesIn: toInt(getVal(row, 'Substitutes in')),
          substitutesOut: toInt(getVal(row, 'Substitutes out')),
          substitutesBench: toInt(getVal(row, 'Substitutes bench')),
          leagueId: toInt(getVal(row, 'League id')),
          leagueName: getVal(row, 'League name'),
          leagueSeason: toInt(getVal(row, 'League season')),
          teamName: getVal(row, 'Team name'),
          rating: toFloat(getVal(row, 'Games rating')),
          season: `${toInt(getVal(row, 'League season'))}/${toInt(getVal(row, 'League season')) + 1}`,
        }

        if (existingStats) {
          await db.playerStats.update({
            where: { playerId },
            data: statsData,
          })
          statsUpdated++
        } else {
          await db.playerStats.create({
            data: { playerId, ...statsData },
          })
          statsCreated++
        }
      } catch (err) {
        errors.push(
          `Row error: ${err instanceof Error ? err.message : 'Unknown'}`
        )
      }
    }

    return NextResponse.json({
      message: `Imported ${rows.length} rows`,
      players: { created, updated },
      stats: { created: statsCreated, updated: statsUpdated },
      errors: errors.slice(0, 10), // Limit error messages
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 })
  }
}
