import { createServer } from 'http'
import { Server } from 'socket.io'
import { Database } from 'bun:sqlite'

// --- Database Setup ---
const DB_PATH = import.meta.dir + '/../../db/custom.db'
const db = new Database(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

// --- Types ---
interface GoalEvent {
  fixtureId: string
  homeTeam: string
  awayTeam: string
  score: string
  minute: number
  status: string
  scoringTeam: 'home' | 'away'
  playerName: string
  homeScore: number
  awayScore: number
}

// --- Socket.IO Server ---
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Previous match data cache ---
let prevMatchesMap = new Map<string, { homeScore: number; awayScore: number; status: string; minute: number }>()

// --- Fetch all matches from DB ---
function fetchMatchesFromDB() {
  const stmt = db.prepare(`
    SELECT m.id, m.homeTeam, m.awayTeam, m.homeScore, m.awayScore, m.status, m.minute,
      m.league, m.leagueLogo, m.homeLogo, m.awayLogo, m.stadium, m.kickoff, m.isHot,
      m.events, m.homeForm, m.awayForm
    FROM Match m
    ORDER BY 
      CASE m.status 
        WHEN 'LIVE' THEN 0 
        WHEN 'HT' THEN 1 
        WHEN 'UPCOMING' THEN 2 
        WHEN 'FT' THEN 3 
      END
  `)
  return stmt.all() as any[]
}

function fetchScorersFromDB() {
  const stmt = db.prepare(`
    SELECT id, name, team, teamLogo, goals, assists, matches, league, photoUrl
    FROM Scorer ORDER BY goals DESC
  `)
  return stmt.all()
}

function fetchStandingsFromDB(league: string = 'Premier League') {
  const stmt = db.prepare(`
    SELECT id, position, team, teamLogo, played, won, drawn, lost, gf, ga, gd, points, league, form
    FROM Standing WHERE league = ? ORDER BY position ASC
  `)
  return stmt.all(league)
}

function formatMatchData(matches: any[]) {
  return matches.map(m => {
    let events = []
    try { events = JSON.parse(m.events as string) } catch { events = [] }
    let homeForm = []
    try { homeForm = JSON.parse(m.homeForm as string) } catch { homeForm = [] }
    let awayForm = []
    try { awayForm = JSON.parse(m.awayForm as string) } catch { awayForm = [] }

    return {
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore as number,
      awayScore: m.awayScore as number,
      status: m.status,
      minute: m.minute as number,
      league: m.league,
      leagueLogo: m.leagueLogo || '',
      homeLogo: m.homeLogo || '',
      awayLogo: m.awayLogo || '',
      stadium: m.stadium || '',
      kickoff: m.kickoff || '',
      isHot: Boolean(m.isHot),
      events,
      homeForm,
      awayForm,
    }
  })
}

// --- Simulate live match progression (MOCK mode) ---
const GOAL_PLAYERS: Record<string, string[]> = {
  'Real Madrid': ['Vinícius Jr.', 'Mbappé', 'Bellingham', 'Rodrygo', 'Valverde', 'Modrić'],
  'Barcelona': ['Lewandowski', 'Yamal', 'Raphinha', 'Pedri', 'Gavi', 'de Jong'],
  'Manchester City': ['Haaland', 'Foden', 'De Bruyne', 'B. Silva', 'Álvarez', 'Rodri'],
  'Napoli': ['Kvaratskhelia', 'Osimhen', 'Politano', 'Zielinski'],
  'Bayern Munich': ['Kane', 'Musiala', 'Sané', 'Müller', 'Gnabry'],
  'Dortmund': ['Brandt', 'Adeyemi', 'Mukoko', 'Füllkrug'],
  'PSG': ['Dembélé', 'Kolo Muani', 'Asensio', 'Barcola'],
  'Marseille': ['Aubameyang', 'Rabiot'],
  'Celtic': ['Kyogo', "O'Riley", 'Hatate'],
  'Rangers': ['Dessers', 'Roofe', 'Sakala'],
  'Feyenoord': ['Giménez', 'Stengs', 'Timber'],
  'AZ Alkmaar': ['Pavlidis', 'de Wit'],
  'Lyon': ['Lacazette', 'Cherki', 'Caqueret'],
  'Monaco': ['Embolo', 'Ben Yedder', 'Golovin'],
}

const updateStmt = db.prepare(`
  UPDATE Match SET homeScore = ?, awayScore = ?, minute = ?, status = ?, events = ?, isHot = ? WHERE id = ?
`)

function simulateMatchUpdates(): GoalEvent[] {
  const matches = fetchMatchesFromDB()
  const goals: GoalEvent[] = []

  for (const match of matches) {
    if (match.status !== 'LIVE') continue

    let newMinute = (match.minute as number) + 1
    let newStatus = match.status as string
    let newHomeScore = match.homeScore as number
    let newAwayScore = match.awayScore as number
    let newIsHot = match.isHot as number

    if (newMinute > 90) { newMinute = 90; newStatus = 'FT' }
    if (newMinute === 46 && newStatus === 'LIVE') { newStatus = 'HT' }

    const homeGoalChance = Math.random() < 0.03
    const awayGoalChance = Math.random() < 0.03

    let eventsArr: any[] = []
    try { eventsArr = JSON.parse(match.events as string) } catch { eventsArr = [] }

    if (homeGoalChance && newMinute <= 90) {
      newHomeScore += 1
      const players = GOAL_PLAYERS[match.homeTeam as string] || ['Unknown']
      const scorer = players[Math.floor(Math.random() * players.length)]
      eventsArr.push({ type: 'goal', team: 'home', player: scorer, minute: newMinute })
      goals.push({
        fixtureId: match.id as string, homeTeam: match.homeTeam as string, awayTeam: match.awayTeam as string,
        score: `${newHomeScore}-${newAwayScore}`, minute: newMinute, status: newStatus,
        scoringTeam: 'home', playerName: scorer, homeScore: newHomeScore, awayScore: newAwayScore,
      })
    }

    if (awayGoalChance && newMinute <= 90) {
      newAwayScore += 1
      const players = GOAL_PLAYERS[match.awayTeam as string] || ['Unknown']
      const scorer = players[Math.floor(Math.random() * players.length)]
      eventsArr.push({ type: 'goal', team: 'away', player: scorer, minute: newMinute })
      goals.push({
        fixtureId: match.id as string, homeTeam: match.homeTeam as string, awayTeam: match.awayTeam as string,
        score: `${newHomeScore}-${newAwayScore}`, minute: newMinute, status: newStatus,
        scoringTeam: 'away', playerName: scorer, homeScore: newHomeScore, awayScore: newAwayScore,
      })
    }

    if (Math.random() < 0.02 && newMinute <= 90) {
      const isHome = Math.random() < 0.5
      const team = isHome ? 'home' : 'away'
      const teamName = (isHome ? match.homeTeam : match.awayTeam) as string
      const players = GOAL_PLAYERS[teamName] || ['Unknown']
      const player = players[Math.floor(Math.random() * players.length)]
      eventsArr.push({ type: 'yellow', team, player, minute: newMinute })
    }

    updateStmt.run(newHomeScore, newAwayScore, newMinute, newStatus, JSON.stringify(eventsArr), newIsHot ? 1 : 0, match.id)
  }
  return goals
}

// --- Real data sync from Football API ---
async function syncRealData(): Promise<GoalEvent[]> {
  const goals: GoalEvent[] = []

  try {
    // Call the Next.js API to sync data
    const response = await fetch('http://localhost:3000/api/football', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncMode: 'live' }),
    })

    if (!response.ok) {
      console.error('Real data sync failed:', response.status)
      return goals
    }

    // Detect goals by comparing before/after
    // This is handled by checkAndEmitUpdates below
  } catch (error) {
    console.error('Error syncing real data:', error)
  }

  return goals
}

// --- Check for changes and emit updates ---
function checkAndEmitUpdates() {
  const rawMatches = fetchMatchesFromDB()
  const formattedMatches = formatMatchData(rawMatches)
  const goals: GoalEvent[] = []

  for (const match of formattedMatches) {
    const prev = prevMatchesMap.get(match.id)
    if (!prev) continue

    if (match.status === 'LIVE' || match.status === 'HT') {
      if (match.homeScore > prev.homeScore) {
        const goalEvent = [...match.events].reverse().find(
          (e: any) => e.type === 'goal' && e.team === 'home' && e.minute === match.minute
        )
        goals.push({
          fixtureId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          score: `${match.homeScore}-${match.awayScore}`, minute: match.minute, status: match.status,
          scoringTeam: 'home', playerName: goalEvent?.player || 'Unknown', homeScore: match.homeScore, awayScore: match.awayScore,
        })
      }
      if (match.awayScore > prev.awayScore) {
        const goalEvent = [...match.events].reverse().find(
          (e: any) => e.type === 'goal' && e.team === 'away' && e.minute === match.minute
        )
        goals.push({
          fixtureId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          score: `${match.homeScore}-${match.awayScore}`, minute: match.minute, status: match.status,
          scoringTeam: 'away', playerName: goalEvent?.player || 'Unknown', homeScore: match.homeScore, awayScore: match.awayScore,
        })
      }
    }
  }

  const newMap = new Map<string, { homeScore: number; awayScore: number; status: string; minute: number }>()
  for (const match of formattedMatches) {
    newMap.set(match.id, { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status, minute: match.minute })
  }

  let hasChanges = prevMatchesMap.size !== newMap.size
  if (!hasChanges) {
    for (const [id, data] of newMap) {
      const prev = prevMatchesMap.get(id)
      if (!prev || prev.homeScore !== data.homeScore || prev.awayScore !== data.awayScore || prev.status !== data.status || prev.minute !== data.minute) {
        hasChanges = true
        break
      }
    }
  }

  prevMatchesMap = newMap

  if (hasChanges || goals.length > 0) {
    for (const goal of goals) {
      console.log(`⚽ GOAL! ${goal.homeTeam} ${goal.homeScore} - ${goal.awayScore} ${goal.awayTeam} (${goal.playerName} ${goal.minute}')`)
      io.emit('goalScored', goal)
    }
    io.emit('liveMatchesUpdate', { matches: formattedMatches, timestamp: new Date().toISOString() })
    if (hasChanges && goals.length === 0) console.log('📡 Match data updated (no goals)')
  }
}

// --- Client Count Tracking ---
let connectedClientCount = 0
function broadcastClientCount() { io.emit('clientCount', connectedClientCount) }

// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
  connectedClientCount++
  console.log(`🔌 Client connected: ${socket.id} (${connectedClientCount} total)`)
  broadcastClientCount()

  const rawMatches = fetchMatchesFromDB()
  const formattedMatches = formatMatchData(rawMatches)
  const scorers = fetchScorersFromDB()
  const standings = fetchStandingsFromDB()

  socket.emit('initialData', { matches: formattedMatches, scorers, standings, timestamp: new Date().toISOString() })

  socket.on('requestUpdate', () => {
    const rawMatches = fetchMatchesFromDB()
    const formattedMatches = formatMatchData(rawMatches)
    socket.emit('liveMatchesUpdate', { matches: formattedMatches, timestamp: new Date().toISOString() })
  })

  socket.on('disconnect', (reason) => {
    connectedClientCount--
    console.log(`🔌 Client disconnected: ${socket.id} (${connectedClientCount} remaining) (${reason})`)
    broadcastClientCount()
  })

  socket.on('error', (error) => { console.error(`Socket error (${socket.id}):`, error) })
})

// --- Main update loop ---
const initialMatches = fetchMatchesFromDB()
const initialFormatted = formatMatchData(initialMatches)
for (const match of initialFormatted) {
  prevMatchesMap.set(match.id, { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status, minute: match.minute })
}

// Determine data mode
const DATA_MODE = process.env.DATA_MODE || 'mock'
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || ''
const useRealData = DATA_MODE === 'real' && FOOTBALL_API_KEY.length > 0

const SIMULATION_INTERVAL = 10000 // 10 detik
const REAL_SYNC_INTERVAL = 30000 // 30 detik untuk real API

setInterval(async () => {
  try {
    if (useRealData) {
      // Real mode: sync dari Football API
      await syncRealData()
    } else {
      // Mock mode: simulasi match progression
      simulateMatchUpdates()
    }

    // Emit perubahan ke semua client
    checkAndEmitUpdates()
  } catch (err) {
    console.error('Error in update cycle:', err)
  }
}, useRealData ? REAL_SYNC_INTERVAL : SIMULATION_INTERVAL)

// --- Start Server ---
const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`⚽ GOALZONE WebSocket Server running on port ${PORT}`)
  console.log(`📡 Data mode: ${useRealData ? 'REAL (API-Football)' : 'MOCK (simulasi)'}`)
  console.log(`⏱️  Update interval: ${useRealData ? REAL_SYNC_INTERVAL / 1000 : SIMULATION_INTERVAL / 1000}s`)
  console.log(`🔗 Connect via: io('/?XTransformPort=${PORT}')`)
})

// --- Graceful Shutdown ---
process.on('SIGTERM', () => { httpServer.close(() => { db.close(); process.exit(0) }) })
process.on('SIGINT', () => { httpServer.close(() => { db.close(); process.exit(0) }) })
