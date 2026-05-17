/**
 * GOALZONE Football API Service
 * Supports API-Football (api-sports.io) via RapidAPI
 * Falls back to mock/simulation when no API key is configured
 */

const API_KEY = process.env.FOOTBALL_API_KEY || ''
const API_HOST = process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io'
const API_BASE = process.env.FOOTBALL_API_BASE || 'https://v3.football.api-sports.io'
const DATA_MODE = process.env.DATA_MODE || 'mock'

export const isRealDataMode = DATA_MODE === 'real' && API_KEY.length > 0

// --- Types ---
export interface FootballFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    periods: { first: number | null; second: number | null }
    venue: { id: number; name: string; city: string } | null
    status: { long: string; short: string; elapsed: number | null }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
  events?: FootballEvent[]
  lineups?: FootballLineup[]
  statistics?: FootballStatistic[]
}

export interface FootballEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number; name: string } | null
  assist: { id: number; name: string } | null
  type: string
  detail: string
  comments: string | null
}

export interface FootballLineup {
  team: { id: number; name: string; logo: string; colors: any }
  formation: string
  startXI: { player: { id: number; name: string; number: number; pos: string; grid: string } }[]
  substitutes: { player: { id: number; name: string; number: number; pos: string; grid: string } }[]
  coach: { id: number; name: string }
}

export interface FootballStatistic {
  team: { id: number; name: string; logo: string }
  statistics: { type: string; value: number | string | null }[]
}

export interface FootballStanding {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    standings: {
      rank: number
      team: { id: number; name: string; logo: string }
      points: number
      goalsDiff: number
      all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
      form: string
      description: string | null
    }[][]
  }
}

export interface FootballScorer {
  player: { id: number; name: string; firstname: string; lastname: string; age: number; photo: string }
  team: { id: number; name: string; logo: string }
  statistics: { appearances: number; goals: number; assists: number; penalty: number }[]
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
    next: { revalidate: 30 }, // Cache 30 detik
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

// --- League IDs ---
export const LEAGUES = {
  PREMIER_LEAGUE: 39,
  LA_LIGA: 140,
  SERIE_A: 135,
  BUNDESLIGA: 78,
  LIGUE_1: 61,
  CHAMPIONS_LEAGUE: 2,
  LIGA_1_INDONESIA: 294,
  Eredivisie: 88,
} as const

// --- Public API Functions ---

/** Get today's live & scheduled fixtures */
export async function getLiveFixtures(leagueId?: number): Promise<FootballFixture[]> {
  const today = new Date().toISOString().split('T')[0]
  const params: Record<string, string | number> = { date: today }
  if (leagueId) params.league = leagueId

  return apiFetch('/fixtures', params)
}

/** Get fixtures for a date range */
export async function getFixturesByDate(date: string, leagueId?: number): Promise<FootballFixture[]> {
  const params: Record<string, string | number> = { date }
  if (leagueId) params.league = leagueId
  return apiFetch('/fixtures', params)
}

/** Get fixture details with events */
export async function getFixtureDetails(fixtureId: number): Promise<FootballFixture> {
  const results = await apiFetch('/fixtures', { id: fixtureId })
  return results[0]
}

/** Get fixture events (goals, cards, subs) */
export async function getFixtureEvents(fixtureId: number): Promise<FootballEvent[]> {
  return apiFetch('/fixtures/events', { fixture: fixtureId })
}

/** Get fixture lineups */
export async function getFixtureLineups(fixtureId: number): Promise<FootballLineup[]> {
  return apiFetch('/fixtures/lineups', { fixture: fixtureId })
}

/** Get fixture statistics */
export async function getFixtureStatistics(fixtureId: number): Promise<FootballStatistic[]> {
  return apiFetch('/fixtures/statistics', { fixture: fixtureId })
}

/** Get league standings */
export async function getStandings(leagueId: number, season: number = 2024): Promise<FootballStanding> {
  const results = await apiFetch('/standings', { league: leagueId, season })
  return results[0]
}

/** Get top scorers */
export async function getTopScorers(leagueId: number, season: number = 2024): Promise<FootballScorer[]> {
  return apiFetch('/players/topscorers', { league: leagueId, season })
}

/** Get head-to-head */
export async function getH2H(team1Id: number, team2Id: number): Promise<FootballFixture[]> {
  return apiFetch('/fixtures/headtohead', { h2h: `${team1Id}-${team2Id}` })
}

/** Search team */
export async function searchTeam(query: string): Promise<any[]> {
  return apiFetch('/teams', { search: query })
}

// --- Transform helpers (API-Football → GOALZONE format) ---

export function transformFixtureToMatch(fixture: FootballFixture) {
  const status = mapStatus(fixture.fixture.status.short)
  const events = (fixture.events || []).map(e => ({
    type: mapEventType(e.type, e.detail),
    team: e.team.name === fixture.teams.home.name ? 'home' : 'away',
    player: e.player?.name || 'Unknown',
    minute: e.time.elapsed,
  }))

  return {
    id: String(fixture.fixture.id),
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeScore: fixture.goals.home ?? 0,
    awayScore: fixture.goals.away ?? 0,
    status,
    minute: fixture.fixture.status.elapsed ?? 0,
    league: fixture.league.name,
    leagueLogo: fixture.league.logo,
    homeLogo: fixture.teams.home.logo,
    awayLogo: fixture.teams.away.logo,
    stadium: fixture.fixture.venue?.name || '',
    kickoff: fixture.fixture.date,
    isHot: false, // Could be determined by league importance or match popularity
    events,
    homeForm: [],
    awayForm: [],
    // Raw data for sync
    rawFixtureId: fixture.fixture.id,
    rawDate: fixture.fixture.date,
    rawLeagueId: fixture.league.id,
    rawHomeId: fixture.teams.home.id,
    rawAwayId: fixture.teams.away.id,
    rawStatus: fixture.fixture.status.short,
    rawSeason: fixture.league.season,
  }
}

function mapStatus(apiStatus: string): string {
  const map: Record<string, string> = {
    '1H': 'LIVE', '2H': 'LIVE', 'HT': 'HT', 'ET': 'LIVE', 'BT': 'LIVE',
    'P': 'LIVE', 'SUSP': 'LIVE', 'INT': 'LIVE', 'LIVE': 'LIVE',
    'FT': 'FT', 'AET': 'FT', 'PEN': 'FT', 'WO': 'FT', 'AWD': 'FT',
    'TBD': 'UPCOMING', 'NS': 'UPCOMING', 'PST': 'UPCOMING', 'CANC': 'UPCOMING',
    'ABD': 'FT',
  }
  return map[apiStatus] || 'UPCOMING'
}

function mapEventType(type: string, detail: string): string {
  if (type === 'Goal') return 'goal'
  if (type === 'Card' && detail.includes('Red')) return 'red'
  if (type === 'Card') return 'yellow'
  if (type === 'subst') return 'substitution'
  if (type === 'Var') return 'var'
  return type.toLowerCase()
}

export function transformStandings(standing: FootballStanding) {
  return standing.league.standings.flat().map(s => ({
    position: s.rank,
    team: s.team.name,
    teamLogo: s.team.logo,
    played: s.all.played,
    won: s.all.win,
    drawn: s.all.draw,
    lost: s.all.lose,
    gf: s.all.goals.for,
    ga: s.all.goals.against,
    gd: s.goalsDiff,
    points: s.points,
    league: standing.league.name,
    form: s.form ? s.form.split('').map((c: string) => c === 'W' ? 'W' : c === 'D' ? 'D' : 'L') : [],
  }))
}

export function transformScorers(scorers: FootballScorer[]) {
  return scorers.map(s => ({
    name: s.player.name,
    team: s.team.name,
    teamLogo: s.team.logo,
    goals: s.statistics[0]?.goals ?? 0,
    assists: s.statistics[0]?.assists ?? 0,
    matches: s.statistics[0]?.appearances ?? 0,
    league: '',
    photoUrl: s.player.photo,
  }))
}

// --- Player Statistics Types ---

export interface FootballPlayerStats {
  player: {
    id: number
    name: string
    firstname: string
    lastname: string
    age: number
    birth: {
      date: string
      place: string
      country: string
    } | null
    nationality: string
    height: string
    weight: string
    injured: boolean
    photo: string
  }
  statistics: {
    team: {
      id: number
      name: string
      logo: string
    }
    league: {
      id: number
      name: string
      country: string
      logo: string
      flag: string
      season: number
    }
    games: {
      appearences: number
      lineups: number
      minutes: number
      number: number | null
      position: string
      rating: string | null
      captain: boolean
    }
    substitutes: {
      in: number
      out: number
      bench: number
    }
    shots: {
      total: number | null
      on: number | null
    }
    goals: {
      total: number | null
      conceded: number | null
      assists: number | null
      saves: number | null
    }
    passes: {
      total: number | null
      key: number | null
      accuracy: number | null
    }
    tackles: {
      total: number | null
      blocks: number | null
      interceptions: number | null
    }
    duels: {
      total: number | null
      won: number | null
    }
    dribbles: {
      attempts: number | null
      success: number | null
      past: number | null
    }
    fouls: {
      drawn: number | null
      committed: number | null
    }
    cards: {
      yellow: number
      yellowred: number
      red: number
    }
    penalty: {
      won: number | null
      commited: number | null
      scored: number | null
      missed: number | null
      saved: number | null
    }
  }[]
}

// --- Player Statistics API Functions ---

/** Get players statistics for a league/season */
export async function getPlayersStatistics(leagueId: number, season: number, page: number = 1): Promise<FootballPlayerStats[]> {
  return apiFetch('/players', { league: leagueId, season, page })
}

/** Get a specific player's statistics by ID and season */
export async function getPlayerById(playerId: number, season: number): Promise<FootballPlayerStats[]> {
  return apiFetch('/players', { id: playerId, season })
}

/** Search players by name */
export async function searchPlayers(query: string, season: number = 2024): Promise<FootballPlayerStats[]> {
  return apiFetch('/players', { search: query, season })
}

// --- Player Statistics Transform Helpers ---

function mapPosition(apiPosition: string): string {
  const map: Record<string, string> = {
    'Attacker': 'FW',
    'Midfielder': 'MF',
    'Defender': 'DF',
    'Goalkeeper': 'GK',
  }
  return map[apiPosition] || apiPosition
}

export function transformPlayerStatsToDb(data: FootballPlayerStats) {
  const player = data.player
  const stats = data.statistics[0] // Use first stats entry (primary league)

  return {
    // Player fields
    apiFootballId: player.id,
    name: player.name,
    firstName: player.firstname || '',
    lastName: player.lastname || '',
    photoUrl: player.photo || '',
    age: player.age || 0,
    birthDate: player.birth?.date || '',
    birthPlace: player.birth?.place || '',
    birthCountry: player.birth?.country || '',
    nationality: player.nationality || '',
    height: player.height || '',
    weight: player.weight || '',
    position: stats?.games?.position ? mapPosition(stats.games.position) : '',
    currentClub: stats?.team?.name || '',
    clubLogo: '',
    teamId: stats?.team?.id || 0,
    teamLogo: stats?.team?.logo || '',
    leagueId: stats?.league?.id || 0,
    rating: parseFloat(stats?.games?.rating || '0'),
    injured: player.injured || false,

    // PlayerStats fields
    leagueName: stats?.league?.name || '',
    leagueSeason: stats?.league?.season || 0,
    teamName: stats?.team?.name || '',
    totalMatches: stats?.games?.appearences || 0,
    lineups: stats?.games?.lineups || 0,
    minutes: stats?.games?.minutes || 0,
    goals: stats?.goals?.total || 0,
    goalsConceded: stats?.goals?.conceded || 0,
    assists: stats?.goals?.assists || 0,
    saves: stats?.goals?.saves || 0,
    shots: stats?.shots?.total || 0,
    shotsOnTarget: stats?.shots?.on || 0,
    passesTotal: stats?.passes?.total || 0,
    passesKey: stats?.passes?.key || 0,
    passingAccuracy: parseFloat(String(stats?.passes?.accuracy || '0')),
    tackles: stats?.tackles?.total || 0,
    tacklesBlocks: stats?.tackles?.blocks || 0,
    interceptions: stats?.tackles?.interceptions || 0,
    duelsTotal: stats?.duels?.total || 0,
    duelsWon: stats?.duels?.won || 0,
    dribblesAttempts: stats?.dribbles?.attempts || 0,
    dribblesSuccess: stats?.dribbles?.success || 0,
    dribblesPast: stats?.dribbles?.past || 0,
    foulsDrawn: stats?.fouls?.drawn || 0,
    foulsCommitted: stats?.fouls?.committed || 0,
    fouls: stats?.fouls?.committed || 0, // keep for backward compat
    yellowCards: stats?.cards?.yellow || 0,
    yellowRedCards: stats?.cards?.yellowred || 0,
    redCards: stats?.cards?.red || 0,
    penaltyWon: stats?.penalty?.won || 0,
    penaltyCommitted: stats?.penalty?.commited || 0,
    penaltyScored: stats?.penalty?.scored || 0,
    penaltyMissed: stats?.penalty?.missed || 0,
    penaltySaved: stats?.penalty?.saved || 0,
    isCaptain: stats?.games?.captain || false,
    substitutesIn: stats?.substitutes?.in || 0,
    substitutesOut: stats?.substitutes?.out || 0,
    substitutesBench: stats?.substitutes?.bench || 0,
    shirtNumber: stats?.games?.number || 0,
    season: stats?.league?.season ? `${stats.league.season}/${stats.league.season + 1}` : '2024/2025',
  }
}
