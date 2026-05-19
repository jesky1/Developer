import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { isRealDataMode } from '@/lib/football-api'
import { getPlayersStatistics, transformPlayerStatsToDb } from '@/lib/player-stats-api'

// POST: Sync player statistics from API-Football to database
export async function POST(request: NextRequest) {
    if (!isRealDataMode) {
        return NextResponse.json({
            error: 'Football API tidak dikonfigurasi. Set FOOTBALL_API_KEY dan DATA_MODE=real di .env',
            mode: 'mock',
        }, { status: 400 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const { playerIds } = body as { playerIds?: number[] }

        if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
            return NextResponse.json({
                error: 'Please provide playerIds array with API-Football player IDs',
            }, { status: 400 })
        }

        const results = {
            synced: 0,
            errors: 0,
            skipped: 0,
        }

        for (const playerId of playerIds) {
            try {
                const playerData = await getPlayersStatistics(playerId)
                if (!playerData) {
                    results.skipped++
                    continue
                }

                const transformed = transformPlayerStatsToDb(playerData)
                if (!transformed) {
                    results.skipped++
                    continue
                }

                // Upsert player
                const player = await db.player.upsert({
                    where: { id: `api-${playerId}` },
                    update: {
                        name: transformed.player.name,
                        firstName: transformed.player.firstName,
                        lastName: transformed.player.lastName,
                        photoUrl: transformed.player.photoUrl,
                        age: transformed.player.age,
                        nationality: transformed.player.nationality,
                        height: transformed.player.height,
                        weight: transformed.player.weight,
                        position: transformed.player.position,
                        shirtNumber: transformed.player.shirtNumber,
                        currentClub: transformed.player.currentClub,
                        clubLogo: transformed.player.clubLogo,
                        rating: transformed.player.rating,
                    },
                    create: {
                        id: `api-${playerId}`,
                        name: transformed.player.name,
                        firstName: transformed.player.firstName,
                        lastName: transformed.player.lastName,
                        photoUrl: transformed.player.photoUrl,
                        age: transformed.player.age,
                        nationality: transformed.player.nationality,
                        height: transformed.player.height,
                        weight: transformed.player.weight,
                        position: transformed.player.position,
                        shirtNumber: transformed.player.shirtNumber,
                        currentClub: transformed.player.currentClub,
                        clubLogo: transformed.player.clubLogo,
                        rating: transformed.player.rating,
                    },
                })

                // Upsert player stats
                await db.playerStats.upsert({
                    where: { playerId: player.id },
                    update: {
                        totalMatches: transformed.stats.totalMatches,
                        goals: transformed.stats.goals,
                        assists: transformed.stats.assists,
                        shots: transformed.stats.shots,
                        shotsOnTarget: transformed.stats.shotsOnTarget,
                        passingAccuracy: transformed.stats.passingAccuracy,
                        tackles: transformed.stats.tackles,
                        interceptions: transformed.stats.interceptions,
                        fouls: transformed.stats.fouls,
                        yellowCards: transformed.stats.yellowCards,
                        redCards: transformed.stats.redCards,
                        rating: transformed.stats.rating,
                        season: transformed.stats.season,
                        matchRatings: transformed.stats.matchRatings,
                    },
                    create: {
                        playerId: player.id,
                        totalMatches: transformed.stats.totalMatches,
                        goals: transformed.stats.goals,
                        assists: transformed.stats.assists,
                        shots: transformed.stats.shots,
                        shotsOnTarget: transformed.stats.shotsOnTarget,
                        passingAccuracy: transformed.stats.passingAccuracy,
                        tackles: transformed.stats.tackles,
                        interceptions: transformed.stats.interceptions,
                        fouls: transformed.stats.fouls,
                        yellowCards: transformed.stats.yellowCards,
                        redCards: transformed.stats.redCards,
                        rating: transformed.stats.rating,
                        season: transformed.stats.season,
                        matchRatings: transformed.stats.matchRatings,
                    },
                })

                results.synced++
            } catch (err) {
                console.error(`Error syncing player ${playerId}:`, err)
                results.errors++
            }
        }

        return NextResponse.json({
            message: 'Player sync completed',
            results,
            mode: 'real',
        })
    } catch (error) {
        console.error('Error syncing player data:', error)
        return NextResponse.json({ error: 'Gagal sync data pemain' }, { status: 500 })
    }
}

// GET: Check player API status
export async function GET() {
    return NextResponse.json({
        mode: isRealDataMode ? 'real' : 'mock',
        apiKeyConfigured: isRealDataMode,
        message: isRealDataMode
            ? 'Player API aktif. Gunakan POST dengan { playerIds: [number] } untuk sync data.'
            : 'Player API belum dikonfigurasi. Set FOOTBALL_API_KEY dan DATA_MODE=real di .env',
    })
}
