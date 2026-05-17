import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  isRealDataMode,
  getLiveFixtures,
  getStandings,
  getTopScorers,
  transformFixtureToMatch,
  transformStandings,
  transformScorers,
  LEAGUES,
} from '@/lib/football-api'

// POST: Sync data dari Football API ke database lokal
// Dipanggil manual dari admin panel atau cron job
export async function POST(request: Request) {
  if (!isRealDataMode) {
    return NextResponse.json({
      error: 'Football API tidak dikonfigurasi. Set FOOTBALL_API_KEY dan DATA_MODE=real di .env',
      mode: 'mock',
    }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { leagues } = body as { leagues?: number[] }

    // Default: sync semua liga utama
    const leagueIds = leagues || [
      LEAGUES.PREMIER_LEAGUE,
      LEAGUES.LA_LIGA,
      LEAGUES.SERIE_A,
      LEAGUES.BUNDESLIGA,
      LEAGUES.LIGUE_1,
    ]

    const results = {
      matches: { synced: 0, errors: 0 },
      standings: { synced: 0, errors: 0 },
      scorers: { synced: 0, errors: 0 },
    }

    // 1. Sync fixtures (matches) hari ini
    try {
      const fixtures = await getLiveFixtures()

      for (const fixture of fixtures) {
        try {
          const matchData = transformFixtureToMatch(fixture)

          await db.match.upsert({
            where: { id: matchData.id },
            update: {
              homeScore: matchData.homeScore,
              awayScore: matchData.awayScore,
              status: matchData.status,
              minute: matchData.minute,
              events: JSON.stringify(matchData.events),
              homeLogo: matchData.homeLogo,
              awayLogo: matchData.awayLogo,
              leagueLogo: matchData.leagueLogo,
              stadium: matchData.stadium,
            },
            create: {
              id: matchData.id,
              homeTeam: matchData.homeTeam,
              awayTeam: matchData.awayTeam,
              homeScore: matchData.homeScore,
              awayScore: matchData.awayScore,
              status: matchData.status,
              minute: matchData.minute,
              league: matchData.league,
              leagueLogo: matchData.leagueLogo,
              homeLogo: matchData.homeLogo,
              awayLogo: matchData.awayLogo,
              stadium: matchData.stadium,
              kickoff: matchData.kickoff,
              events: JSON.stringify(matchData.events),
              homeForm: JSON.stringify(matchData.homeForm),
              awayForm: JSON.stringify(matchData.awayForm),
              isHot: matchData.isHot,
            },
          })

          results.matches.synced++
        } catch (err) {
          console.error('Error syncing fixture:', err)
          results.matches.errors++
        }
      }
    } catch (err) {
      console.error('Error fetching fixtures:', err)
      results.matches.errors++
    }

    // 2. Sync standings per league
    for (const leagueId of leagueIds) {
      try {
        const standingData = await getStandings(leagueId)
        if (!standingData) continue

        const standings = transformStandings(standingData)

        for (const s of standings) {
          await db.standing.upsert({
            where: { id: `${leagueId}-${s.team}` },
            update: {
              position: s.position,
              played: s.played,
              won: s.won,
              drawn: s.drawn,
              lost: s.lost,
              gf: s.gf,
              ga: s.ga,
              gd: s.gd,
              points: s.points,
              form: JSON.stringify(s.form),
            },
            create: {
              id: `${leagueId}-${s.team}`,
              position: s.position,
              team: s.team,
              teamLogo: s.teamLogo,
              played: s.played,
              won: s.won,
              drawn: s.drawn,
              lost: s.lost,
              gf: s.gf,
              ga: s.ga,
              gd: s.gd,
              points: s.points,
              league: s.league,
              form: JSON.stringify(s.form),
            },
          })

          results.standings.synced++
        }
      } catch (err) {
        console.error(`Error syncing standings for league ${leagueId}:`, err)
        results.standings.errors++
      }
    }

    // 3. Sync top scorers per league
    for (const leagueId of leagueIds) {
      try {
        const scorersData = await getTopScorers(leagueId)
        const scorers = transformScorers(scorersData)

        for (const s of scorers) {
          await db.scorer.upsert({
            where: { id: `${leagueId}-${s.name}` },
            update: {
              goals: s.goals,
              assists: s.assists,
              matches: s.matches,
            },
            create: {
              id: `${leagueId}-${s.name}`,
              name: s.name,
              team: s.team,
              teamLogo: s.teamLogo,
              goals: s.goals,
              assists: s.assists,
              matches: s.matches,
              league: `${leagueId}`,
              photoUrl: s.photoUrl,
            },
          })

          results.scorers.synced++
        }
      } catch (err) {
        console.error(`Error syncing scorers for league ${leagueId}:`, err)
        results.scorers.errors++
      }
    }

    return NextResponse.json({
      message: 'Sync data football berhasil',
      results,
      mode: 'real',
    })
  } catch (error) {
    console.error('Error syncing football data:', error)
    return NextResponse.json({ error: 'Gagal sync data football' }, { status: 500 })
  }
}

// GET: Check football API status
export async function GET() {
  return NextResponse.json({
    mode: isRealDataMode ? 'real' : 'mock',
    apiKeyConfigured: isRealDataMode,
    supportedLeagues: Object.entries(LEAGUES).map(([name, id]) => ({ name, id })),
    message: isRealDataMode
      ? 'Football API aktif. Gunakan POST untuk sync data.'
      : 'Football API belum dikonfigurasi. Set FOOTBALL_API_KEY dan DATA_MODE=real di .env',
  })
}
