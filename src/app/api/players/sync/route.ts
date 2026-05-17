import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isRealDataMode, getPlayersStatistics, transformPlayerStatsToDb } from '@/lib/football-api'

export async function POST(request: NextRequest) {
  try {
    if (!isRealDataMode) {
      return NextResponse.json(
        { error: 'API-Football not configured. Set DATA_MODE=real and FOOTBALL_API_KEY.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { leagueId, season, page = 1 } = body

    if (!leagueId || !season) {
      return NextResponse.json(
        { error: 'leagueId and season are required' },
        { status: 400 }
      )
    }

    const playersData = await getPlayersStatistics(leagueId, season, page)

    let created = 0
    let updated = 0

    for (const data of playersData) {
      if (!data.statistics || data.statistics.length === 0) continue

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
    }

    return NextResponse.json({
      message: `Synced ${playersData.length} players`,
      created,
      updated,
      total: playersData.length,
    })
  } catch (error) {
    console.error('Player sync error:', error)
    return NextResponse.json({ error: 'Failed to sync players' }, { status: 500 })
  }
}
