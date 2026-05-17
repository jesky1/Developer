import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Convert a slug like "man-city" or "arsenal" to a probable team name
 * like "Man City" or "Arsenal" for matching against the DB.
 */
function slugToTeamName(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params

    // Try to find standing — first by exact ID (cuid), then by slug
    let standing = await db.standing.findUnique({ where: { id: rawId } })

    if (!standing) {
      // Try slug-based lookup (e.g. "arsenal" → "Arsenal", "man-city" → "Man City")
      const teamName = slugToTeamName(rawId)
      standing = await db.standing.findFirst({
        where: {
          team: teamName,
        },
      })
    }

    if (!standing) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const teamName = standing.team
    const teamLogo = standing.teamLogo
    const league = standing.league
    const form: string[] = JSON.parse(standing.form)

    const played = standing.played || 1
    const winRate = Math.round((standing.won / played) * 100)
    const avgGoalsScored = parseFloat((standing.gf / played).toFixed(2))
    const avgGoalsConceded = parseFloat((standing.ga / played).toFixed(2))

    const stats = {
      position: standing.position,
      played: standing.played,
      won: standing.won,
      drawn: standing.drawn,
      lost: standing.lost,
      gf: standing.gf,
      ga: standing.ga,
      gd: standing.gd,
      points: standing.points,
      form,
      winRate,
      avgGoalsScored,
      avgGoalsConceded,
    }

    // Get players for this club (use exact teamName from standing record)
    const playersRaw = await db.player.findMany({
      where: { currentClub: teamName },
      include: { stats: true },
      orderBy: { rating: 'desc' },
    })

    const squadGroups = {
      goalkeepers: [] as object[],
      defenders: [] as object[],
      midfielders: [] as object[],
      forwards: [] as object[],
    }

    for (const p of playersRaw) {
      const playerObj: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl,
        position: p.position,
        shirtNumber: p.shirtNumber,
        nationality: p.nationality,
        age: p.age,
        rating: p.rating,
      }

      if (p.stats) {
        playerObj.stats = {
          goals: p.stats.goals,
          assists: p.stats.assists,
          yellowCards: p.stats.yellowCards,
          redCards: p.stats.redCards,
        }
      } else {
        playerObj.stats = null
      }

      const pos = p.position?.toUpperCase() || ''
      if (pos === 'GK') {
        squadGroups.goalkeepers.push(playerObj)
      } else if (['DF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) {
        squadGroups.defenders.push(playerObj)
      } else if (['MF', 'CM', 'CDM', 'CAM', 'LM', 'RM', 'AM'].includes(pos)) {
        squadGroups.midfielders.push(playerObj)
      } else if (['FW', 'ST', 'CF', 'LW', 'RW', 'LF', 'RF'].includes(pos)) {
        squadGroups.forwards.push(playerObj)
      } else {
        // Default to midfielders if unknown
        squadGroups.midfielders.push(playerObj)
      }
    }

    // Get recent matches (FT, LIVE, HT) and upcoming matches
    const recentMatchesRaw = await db.match.findMany({
      where: {
        status: { in: ['FT', 'LIVE', 'HT'] },
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const upcomingMatchesRaw = await db.match.findMany({
      where: {
        status: 'UPCOMING',
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      orderBy: { kickoff: 'asc' },
      take: 5,
    })

    const mapMatch = (m: {
      id: string
      homeTeam: string
      awayTeam: string
      homeScore: number
      awayScore: number
      status: string
      minute: number
      league: string
      leagueLogo: string
      homeLogo: string
      awayLogo: string
      kickoff: string
      isHot: boolean
    }) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      minute: m.minute,
      league: m.league,
      leagueLogo: m.leagueLogo,
      homeLogo: m.homeLogo,
      awayLogo: m.awayLogo,
      kickoff: m.kickoff,
      isHot: m.isHot,
    })

    const recentMatches = recentMatchesRaw.map(mapMatch)
    const upcomingMatches = upcomingMatchesRaw.map(mapMatch)

    return NextResponse.json({
      id: standing.id,
      name: teamName,
      logo: teamLogo,
      league,
      stats,
      squad: squadGroups,
      recentMatches,
      upcomingMatches,
    })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}
