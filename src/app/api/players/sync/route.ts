import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isRealDataMode } from '@/lib/football-api'
import { getPlayersStatistics, transformPlayerStatsToDb } from '@/lib/player-stats-api'

export async function POST(request: NextRequest) {
  try {
    // Check configuration first
    const apiKey = process.env.FOOTBALL_API_KEY || ''
    const dataMode = process.env.DATA_MODE || 'mock'

    if (!isRealDataMode) {
      return NextResponse.json({
        error: 'API-Football not configured',
        details: {
          dataMode,
          apiKeySet: apiKey.length > 0,
          apiKeyLength: apiKey.length,
          hint: 'Set DATA_MODE=real and FOOTBALL_API_KEY in your environment variables',
          envExample: 'DATA_MODE=real\nFOOTBALL_API_KEY=your_api_key_here',
          registerUrl: 'https://www.api-football.com/',
        },
      }, { status: 400 })
    }

    const body = await request.json()
    const { leagueId, season, page = 1 } = body

    if (!leagueId || !season) {
      return NextResponse.json(
        { error: 'leagueId and season are required', example: { leagueId: 39, season: 2024, page: 1 } },
        { status: 400 }
      )
    }

    console.log(`[Player Sync] Starting: league=${leagueId}, season=${season}, page=${page}`)

    let playersData: any[]
    try {
      playersData = await getPlayersStatistics(leagueId, season, page)
    } catch (apiError: any) {
      console.error('[Player Sync] API-Football request failed:', apiError)
      return NextResponse.json({
        error: 'API-Football request failed',
        details: apiError.message || 'Unknown API error',
        hint: 'Check your FOOTBALL_API_KEY is valid and your subscription is active at https://dashboard.api-football.com/',
        requestParams: { leagueId, season, page },
      }, { status: 502 })
    }

    if (!playersData || playersData.length === 0) {
      return NextResponse.json({
        message: 'No players data returned from API',
        requestParams: { leagueId, season, page },
        hint: page > 1 ? 'This page may be beyond available data. Try page=1' : 'Check if the league/season combination is valid',
      })
    }

    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const data of playersData) {
      try {
        if (!data.statistics || data.statistics.length === 0) {
          skipped++
          continue
        }

        const transformed = transformPlayerStatsToDb(data)
        const {
          leagueName, leagueSeason, teamName, lineups, minutes, goalsConceded, saves,
          passesTotal, passesKey, tacklesBlocks, duelsTotal, duelsWon, dribblesAttempts,
          dribblesSuccess, dribblesPast, foulsDrawn, foulsCommitted, yellowRedCards,
          penaltyWon, penaltyCommitted, penaltyScored, penaltyMissed, penaltySaved,
          isCaptain, substitutesIn, substitutesOut, substitutesBench,
          ...playerFields
        } = transformed

        // Upsert player by apiFootballId
        const existingPlayer = await db.player.findFirst({
          where: { apiFootballId: data.player.id },
          include: { stats: true },
        })

        let playerId: string

        if (existingPlayer) {
          await db.player.update({
            where: { id: existingPlayer.id },
            data: {
              name: playerFields.name,
              firstName: playerFields.firstName,
              lastName: playerFields.lastName,
              photoUrl: playerFields.photoUrl,
              age: playerFields.age,
              birthDate: playerFields.birthDate,
              birthPlace: playerFields.birthPlace,
              birthCountry: playerFields.birthCountry,
              nationality: playerFields.nationality,
              height: playerFields.height,
              weight: playerFields.weight,
              position: playerFields.position,
              currentClub: playerFields.currentClub,
              clubLogo: playerFields.clubLogo,
              teamId: playerFields.teamId,
              teamLogo: playerFields.teamLogo,
              leagueId: playerFields.leagueId,
              rating: playerFields.rating,
              injured: playerFields.injured,
            },
          })
          playerId = existingPlayer.id
          updated++
        } else {
          const newPlayer = await db.player.create({
            data: {
              apiFootballId: data.player.id,
              name: playerFields.name,
              firstName: playerFields.firstName,
              lastName: playerFields.lastName,
              photoUrl: playerFields.photoUrl,
              age: playerFields.age,
              birthDate: playerFields.birthDate,
              birthPlace: playerFields.birthPlace,
              birthCountry: playerFields.birthCountry,
              nationality: playerFields.nationality,
              height: playerFields.height,
              weight: playerFields.weight,
              position: playerFields.position,
              currentClub: playerFields.currentClub,
              clubLogo: playerFields.clubLogo,
              teamId: playerFields.teamId,
              teamLogo: playerFields.teamLogo,
              leagueId: playerFields.leagueId,
              rating: playerFields.rating,
              injured: playerFields.injured,
              shirtNumber: playerFields.shirtNumber,
            },
          })
          playerId = newPlayer.id
          created++
        }

        // Upsert player stats
        const existingStats = await db.playerStats.findUnique({ where: { playerId } })

        const statsData = {
          totalMatches: playerFields.totalMatches,
          goals: playerFields.goals,
          assists: playerFields.assists,
          shots: playerFields.shots,
          shotsOnTarget: playerFields.shotsOnTarget,
          passingAccuracy: playerFields.passingAccuracy,
          tackles: playerFields.tackles,
          interceptions: playerFields.interceptions,
          fouls: playerFields.fouls,
          yellowCards: playerFields.yellowCards,
          redCards: playerFields.redCards,
          rating: playerFields.rating,
          season: playerFields.season,
          leagueId: transformed.leagueId,
          leagueName,
          leagueSeason,
          teamName,
          lineups,
          minutes,
          goalsConceded,
          saves,
          passesTotal,
          passesKey,
          tacklesBlocks,
          duelsTotal,
          duelsWon,
          dribblesAttempts,
          dribblesSuccess,
          dribblesPast,
          foulsDrawn,
          foulsCommitted,
          yellowRedCards,
          penaltyWon,
          penaltyCommitted,
          penaltyScored,
          penaltyMissed,
          penaltySaved,
          isCaptain,
          substitutesIn,
          substitutesOut,
          substitutesBench,
        }

        if (existingStats) {
          await db.playerStats.update({
            where: { playerId },
            data: statsData,
          })
        } else {
          await db.playerStats.create({
            data: { playerId, ...statsData },
          })
        }
      } catch (playerError) {
        console.error(`[Player Sync] Error processing player ${data.player?.id}:`, playerError)
        errors++
      }
    }

    const result = {
      success: true,
      message: `Synced ${playersData.length} players (page ${page})`,
      created,
      updated,
      skipped,
      errors,
      total: playersData.length,
      requestParams: { leagueId, season, page },
      hint: playersData.length >= 20 ? 'More pages available. Increment page to fetch more players.' : 'Last page reached.',
    }

    console.log('[Player Sync] Complete:', result)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Player Sync] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to sync players',
      details: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

// GET: Check sync configuration status
export async function GET() {
  try {
    const apiKey = process.env.FOOTBALL_API_KEY || ''
    const dataMode = process.env.DATA_MODE || 'mock'
    const apiHost = process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io'

    // Count existing players in DB
    const playerCount = await db.player.count()
    const statsCount = await db.playerStats.count()

    return NextResponse.json({
      configuration: {
        dataMode,
        apiKeySet: apiKey.length > 0,
        apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'NOT SET',
        apiHost,
        isRealDataMode,
      },
      database: {
        players: playerCount,
        playerStats: statsCount,
      },
      availableLeagues: {
        PREMIER_LEAGUE: { id: 39, name: 'Premier League (England)' },
        LA_LIGA: { id: 140, name: 'La Liga (Spain)' },
        SERIE_A: { id: 135, name: 'Serie A (Italy)' },
        BUNDESLIGA: { id: 78, name: 'Bundesliga (Germany)' },
        LIGUE_1: { id: 61, name: 'Ligue 1 (France)' },
        CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League' },
        EREDIVISIE: { id: 88, name: 'Eredivisie (Netherlands)' },
        LIGA_1_INDONESIA: { id: 294, name: 'Liga 1 (Indonesia)' },
      },
      usage: {
        singlePage: 'POST /api/players/sync {"leagueId": 39, "season": 2024, "page": 1}',
        batchSync: 'POST /api/players/sync/batch {"leagueId": 39, "season": 2024, "maxPages": 5}',
        testConnection: 'GET /api/football/test',
      },
      setupInstructions: [
        '1. Register at https://www.api-football.com/ (free tier: 100 requests/day)',
        '2. Get your API key from the dashboard',
        '3. Set environment variables: DATA_MODE=real, FOOTBALL_API_KEY=your_key',
        '4. For Vercel: Add env vars in Project Settings > Environment Variables',
        '5. Redeploy after adding env vars',
        '6. Test with: GET /api/football/test',
        '7. Sync with: POST /api/players/sync',
      ],
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error.message,
    }, { status: 500 })
  }
}
