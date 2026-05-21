import { db, ensureDbConnection } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.FOOTBALL_API_KEY

const LEAGUE_IDS: Record<string, number> = {
  'Premier League': 39,
  'La Liga': 140,
  'Serie A': 135,
  'Bundesliga': 78,
  'Ligue 1': 61,
  'Champions League': 2,
  'Eredivisie': 88,
  'Liga 1 Indonesia': 274,
}

export async function GET(request: NextRequest) {
  try {
    const connected = await ensureDbConnection(2)

    if (!connected) {
      return NextResponse.json(
        { error: 'Database temporarily unavailable' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)

    const league =
      searchParams.get('league') || 'Premier League'

    // =========================
    // CHECK DATABASE FIRST
    // =========================

    let standings = await db.standing.findMany({
      where: { league },
      orderBy: { position: 'asc' },
    })

    // =========================
    // IF EMPTY → FETCH API
    // =========================

    if (standings.length === 0) {
      const leagueId = LEAGUE_IDS[league]

      if (!leagueId) {
        return NextResponse.json([])
      }

      const season = 2024

      const res = await fetch(
        `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
        {
          headers: {
            'x-apisports-key': API_KEY || '',
          },
          cache: 'no-store',
        }
      )

      const data = await res.json()

      const apiStandings =
        data?.response?.[0]?.league?.standings?.[0] || []

      // SAVE TO DATABASE
      for (const team of apiStandings) {
        await db.standing.create({
          data: {
            position: team.rank,
            team: team.team.name,
            teamLogo: team.team.logo,
            played: team.all.played,
            won: team.all.win,
            drawn: team.all.draw,
            lost: team.all.lose,
            gf: team.all.goals.for,
            ga: team.all.goals.against,
            gd: team.goalsDiff,
            points: team.points,
            form: JSON.stringify(
              team.form
                ? team.form.split('').slice(-5)
                : []
            ),
            league,
          },
        })
      }

      // FETCH AGAIN FROM DATABASE
      standings = await db.standing.findMany({
        where: { league },
        orderBy: { position: 'asc' },
      })
    }

    // =========================
    // FORMAT RESPONSE
    // =========================

    const parsedStandings = standings.map((s) => ({
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
      form: (() => {
        try {
          return JSON.parse(s.form)
        } catch {
          return []
        }
      })(),
      league: s.league,
    }))

    return NextResponse.json(parsedStandings)

  } catch (error) {
    console.error('Error fetching standings:', error)

    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    )
  }
}