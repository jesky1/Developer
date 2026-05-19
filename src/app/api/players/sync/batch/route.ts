import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isRealDataMode } from '@/lib/football-api'
import { getPlayersStatistics, transformPlayerStatsToDb } from '@/lib/player-stats-api'

export async function POST(request: NextRequest) {
    try {
        if (!isRealDataMode) {
            return NextResponse.json({
                error: 'API-Football not configured',
                hint: 'Set DATA_MODE=real and FOOTBALL_API_KEY in environment variables',
            }, { status: 400 })
        }

        const body = await request.json()
        const { leagueId, season, maxPages = 5, startPage = 1 } = body

        if (!leagueId || !season) {
            return NextResponse.json(
                { error: 'leagueId and season are required', example: { leagueId: 39, season: 2024, maxPages: 5 } },
                { status: 400 }
            )
        }

        console.log(`[Batch Sync] Starting: league=${leagueId}, season=${season}, pages=${startPage}-${startPage + maxPages - 1}`)

        const pageResults = []
        let totalCreated = 0
        let totalUpdated = 0
        let totalErrors = 0

        for (let page = startPage; page < startPage + maxPages; page++) {
            try {
                console.log(`[Batch Sync] Fetching page ${page}...`)
                const playersData = await getPlayersStatistics(leagueId, season, page)

                if (!playersData || playersData.length === 0) {
                    pageResults.push({ page, status: 'EMPTY', count: 0 })
                    break // No more data
                }

                let created = 0
                let updated = 0
                let errors = 0

                for (const data of playersData) {
                    try {
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
                            await db.playerStats.update({ where: { playerId }, data: statsData })
                        } else {
                            await db.playerStats.create({ data: { playerId, ...statsData } })
                        }
                    } catch (playerError) {
                        console.error(`[Batch Sync] Error on player ${data.player?.id}:`, playerError)
                        errors++
                    }
                }

                totalCreated += created
                totalUpdated += updated
                totalErrors += errors

                pageResults.push({
                    page,
                    status: 'OK',
                    count: playersData.length,
                    created,
                    updated,
                    errors,
                })

                // If less than 20 results, this is likely the last page
                if (playersData.length < 20) {
                    pageResults[pageResults.length - 1].lastPage = true
                    break
                }

                // Rate limiting: wait 1.5 seconds between pages (API-Football has rate limits)
                await new Promise(resolve => setTimeout(resolve, 1500))

            } catch (pageError: any) {
                console.error(`[Batch Sync] Error on page ${page}:`, pageError)
                pageResults.push({ page, status: 'ERROR', error: pageError.message })
                totalErrors++
                // Continue to next page
            }
        }

        const result = {
            success: true,
            message: `Batch sync complete`,
            leagueId,
            season,
            totalPages: pageResults.length,
            totalCreated,
            totalUpdated,
            totalErrors,
            pages: pageResults,
        }

        console.log('[Batch Sync] Complete:', result)
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[Batch Sync] Unexpected error:', error)
        return NextResponse.json({
            error: 'Batch sync failed',
            details: error.message,
        }, { status: 500 })
    }
}
