/**
 * GOALZONE Player Statistics API Service
 * Separated from football-api.ts to avoid Turbopack module resolution issues.
 * Supports API-Football (api-sports.io) via RapidAPI
 */

const API_KEY = process.env.FOOTBALL_API_KEY || ''
const API_HOST = process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io'
const API_BASE = process.env.FOOTBALL_API_BASE || 'https://v3.football.api-sports.io'
const DATA_MODE = process.env.DATA_MODE || 'mock'

export const isPlayerApiConfigured = DATA_MODE === 'real' && API_KEY.length > 0

// --- Types ---

/** API-Football player statistics response type */
export interface FootballPlayerStats {
    player: {
        id: number
        name: string
        firstname: string
        lastname: string
        age: number
        height: string
        weight: string
        photo: string
        nationality: string
    }
    statistics: {
        team: { id: number; name: string; logo: string }
        league: { id: number; name: string; country: string; logo: string; flag: string }
        games: { appearances: number; minutes: number; number: number | null; position: string; rating: string | null; captain: boolean }
        substitutes: { in: number; out: number; bench: number }
        shots: { total: number | null; on: number | null }
        goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null }
        passes: { total: number | null; key: number | null; accuracy: string | null }
        tackles: { total: number | null; blocks: number | null; interceptions: number | null }
        duels: { total: number | null; won: number | null }
        dribbles: { attempts: number | null; success: number | null; past: number | null }
        fouls: { drawn: number | null; committed: number | null }
        cards: { yellow: number; yellowred: number; red: number }
        penalty: { won: number | null; commited: number | null; scored: number | null; missed: number | null; saved: number | null }
    }[]
}

// --- API Fetch Helper ---

async function apiFetch(endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
    const url = new URL(`${API_BASE}${endpoint}`)
    Object.entries(params).forEach(([key, val]) => url.searchParams.set(key, String(val)))

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY,
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': API_HOST,
        },
        next: { revalidate: 60 }, // Cache 60 detik untuk player data
    })

    if (!response.ok) {
        throw new Error(`Football API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('Football API errors:', data.errors)
        throw new Error(`Football API returned errors: ${JSON.stringify(data.errors)}`)
    }

    return data.response
}

// --- Public API Functions ---

/**
 * Get player statistics from API-Football.
 * @param playerId - API-Football player ID
 * @param season - Season year (default current season)
 * @returns Player statistics data or null if not found
 */
export async function getPlayersStatistics(playerId: number, season?: number): Promise<FootballPlayerStats | null> {
    const seasonYear = season || (new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0))
    try {
        const results = await apiFetch('/players', { id: playerId, season: seasonYear })
        return results?.[0] ?? null
    } catch (error) {
        console.error('Error fetching player statistics:', error)
        return null
    }
}

/**
 * Transform API-Football player statistics into GOALZONE database format.
 * Returns data ready for Prisma Player + PlayerStats upsert.
 */
export function transformPlayerStatsToDb(data: FootballPlayerStats, seasonYear?: number) {
    const { player, statistics } = data
    const currentSeason = seasonYear || (new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0))

    // Use first statistics entry (primary team/league)
    const stat = statistics?.[0]
    if (!stat) return null

    return {
        // Player data
        player: {
            name: player.name || '',
            firstName: player.firstname || '',
            lastName: player.lastname || '',
            photoUrl: player.photo || '',
            age: player.age || 0,
            nationality: player.nationality || '',
            height: player.height || '',
            weight: player.weight || '',
            position: stat.games?.position || '',
            shirtNumber: stat.games?.number || 0,
            currentClub: stat.team?.name || '',
            clubLogo: stat.team?.logo || '',
            rating: parseFloat(stat.games?.rating || '0'),
        },
        // Stats data
        stats: {
            totalMatches: stat.games?.appearances || 0,
            goals: stat.goals?.total || 0,
            assists: stat.goals?.assists || 0,
            shots: stat.shots?.total || 0,
            shotsOnTarget: stat.shots?.on || 0,
            passingAccuracy: parseFloat(stat.passes?.accuracy || '0'),
            tackles: stat.tackles?.total || 0,
            interceptions: stat.tackles?.interceptions || 0,
            fouls: stat.fouls?.committed || 0,
            yellowCards: stat.cards?.yellow || 0,
            redCards: stat.cards?.red || 0,
            rating: parseFloat(stat.games?.rating || '0'),
            season: `${currentSeason}`,
            matchRatings: JSON.stringify([]),
        },
        // Raw IDs for reference
        rawPlayerId: player.id,
        rawTeamId: stat.team?.id,
        rawLeagueId: stat.league?.id,
    }
}
