---
Task ID: 1
Agent: main
Task: Fix match detail page functionality - Player click, photos, navigation, data sync, field UI

Work Log:
- Read all relevant source files (match/[id]/page.tsx, lineup-tab.tsx, player-detail-modal.tsx, navigation hook, APIs, DB schema)
- Updated match detail page with PlayerDetailModal integration
- Added match data cache (Map with TTL) to prevent empty screens on back navigation
- Changed Back/Home buttons to use router.replace("/") to avoid history trap
- Added player lookup loading indicator in header
- Updated lineup tab with professional player silhouette SVG fallback
- Improved field positions with dynamic padding based on player count per line
- Constrained name badge width to prevent overlap
- Added player photos to bench section and starting XI list
- Enriched lineup API with player photos using fuzzy name matching
- Created /api/player/by-name endpoint with accent-insensitive fuzzy matching
- Updated 57 players in DB with real photo URLs from api-sports.io
- Moved JSON-LD structured data from client component to server-side layout.tsx <head>
- Removed StructuredData component import from client page.tsx

Stage Summary:
- Player click now opens PlayerDetailModal with full stats, transfers, and performance chart
- Player headshots show real photos from DB, with professional silhouette SVG fallback
- Lineup API uses fuzzy name matching (e.g., "Walker" → "Kyle Walker") for photo enrichment
- Navigation uses router.replace() to prevent back-button history trap
- Match data cached for 1 minute to prevent blank screen on revisit
- Field positions optimized with dynamic padding to prevent name overlap
- JSON-LD structured data moved to server-side to fix React script-tag warning

---
Task ID: 1
Agent: seed-update
Task: Update Prisma seed file with more leagues, standings, scorers, and matches

Work Log:
- Read existing prisma/seed.ts (685 lines) to understand current data structure
- Added 5 new matches: 3 Liga 1 Indonesia, 1 Eredivisie (PSV vs Ajax), 1 Champions League (Real Madrid vs Inter Milan)
- Added 36 new standings across 5 new leagues:
  - Bundesliga (8 teams: Bayern Munich, Leverkusen, Dortmund, Stuttgart, RB Leipzig, Frankfurt, Freiburg, Wolfsburg)
  - Ligue 1 (6 teams: PSG, Marseille, Monaco, Lille, Lyon, Nice)
  - Liga 1 Indonesia (8 teams: Persib Bandung, Persija Jakarta, Arema FC, Bali United, PSM Makassar, Persebaya Surabaya, Borneo FC, PSIS Semarang)
  - Eredivisie (6 teams: PSV, Ajax, Feyenoord, AZ Alkmaar, Twente, Utrecht)
  - Champions League (8 teams: Real Madrid, Manchester City, Barcelona, Inter Milan, Bayern Munich, Arsenal, PSG, Dortmund)
- Added 13 new scorers across all new leagues:
  - Bundesliga: Harry Kane (28g/8a), Jamal Musiala (8g/7a)
  - Ligue 1: Ousmane Dembélé (12g/8a), Marc Cucres (10g/5a)
  - Eredivisie: Tyrese Asante (15g/6a), Brian Brobbey (14g/5a), Santiago Giménez (13g/4a)
  - Liga 1 Indonesia: David Da Silva (16g/4a), Marko Simic (14g/3a), Ilija Spasojevic (12g/5a)
  - Champions League: Vinícius Jr. (5g/3a), Erling Haaland (4g/2a), Lamine Yamal (3g/3a)
- Used Wikipedia SVG URLs for team logos where available; empty string for Liga 1 Indonesia teams
- Verified seed runs successfully: 57 players, 20 matches, 50 standings, 23 scorers, 20 polls, 5 news items

Stage Summary:
- Seed file now covers 9 leagues (was 3): Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Liga 1 Indonesia, Eredivisie, Champions League, plus existing Scottish Prem/Primeira Liga matches
- Standings grew from 14 to 50 entries
- Scorers grew from 10 to 23 entries
- Matches grew from 15 to 20 entries
- All existing data preserved; only additions made

---
Task ID: 2-b
Agent: subagent
Task: Create footer legal pages as modals and update footer component

Work Log:
- Read existing footer.tsx, news-detail-modal.tsx, standings-section.tsx, page.tsx to understand patterns
- Created `src/components/legal-pages-modal.tsx` with 4 legal pages as modal content:
  - About Us: Brand intro, mission, founded 2025, stat cards (8+ leagues, real-time, AI)
  - Contact: Form with Name/Email/Subject/Message fields + Send button (toast "Message sent!")
  - Privacy Policy: 7 numbered sections with neon-styled section badges
  - Terms of Service: 7 numbered sections with same numbered badge pattern
- Modal uses Framer Motion: slide-up from bottom on mobile, centered on desktop
- Backdrop with blur, scrollable content area, close button, glass-card styling
- Updated `src/components/footer.tsx`:
  - Added `onLeagueClick` optional prop for league navigation
  - Added internal modal state (`openPage`) for legal pages - self-contained
  - Expanded leagues list: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Eredivisie, Liga 1 Indonesia
  - League links are clickable buttons with MapPin icons and country codes
  - Legal links are buttons that open LegalPagesModal
  - Navigation links point to #live and #standings anchors
  - Responsive grid: 1 col mobile → 2 col sm → 4 col md
- Updated `src/app/page.tsx`:
  - Added `footerSelectedLeague` state to coordinate footer league clicks with standings
  - Added `handleLeagueClick` callback that sets league + scrolls to #standings
  - Passed `onLeagueClick` to Footer and `selectedLeague` to StandingsSection
- Updated `src/components/standings-section.tsx`:
  - Added `selectedLeague` optional prop
  - Added useEffect to sync external league selection with internal `activeLeague` state
- Lint passed, dev server compiling successfully

Stage Summary:
- Footer legal pages open as beautiful modals (About, Contact, Privacy, Terms)
- Contact form shows toast on submit
- Footer league links scroll to standings and filter the league tab
- All 8 leagues listed in footer with country codes
- Modal matches neon/glass-card theme consistent with app

---
Task ID: 2-a
Agent: subagent
Task: Update Standings Section with expanded leagues & make Sidebar interactive (TopScorers + LeagueTable)

Work Log:
- Read all affected files: standings-section.tsx, sidebar-section.tsx, page.tsx, socket.ts, use-socket.ts, scorers API, player-detail-modal.tsx, prisma schema, ws-service
- **Standings Section (TASK 1)**:
  - Expanded LEAGUES array from 3 to 8 leagues: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Eredivisie, Liga 1 Indonesia
  - Added `glow` property per league for colored shadow effect on active tab (e.g., `shadow-purple-500/40`)
  - Redesigned league tabs: rounded-xl, larger padding, snap-x scroll, colored glow shadow on active tab, pulsing color dot
  - Added right-side scroll fade gradient indicator
- **Socket Types**:
  - Updated `Scorer` interface in socket.ts: added `teamLogo?`, `league?`, `photoUrl?`
  - Updated `Standing` interface in socket.ts: added `teamLogo?`, `league?`
- **use-socket Hook**:
  - Updated `fetchScorersFromAPI` to map `teamLogo`, `league`, `photoUrl` from API response
  - Updated `fetchStandingsFromAPI` to map `teamLogo`, `league` from API response
- **Scorers API Route**:
  - Added `teamLogo` and `photoUrl` to the API response (were missing from the serialized output)
- **Sidebar Section (TASK 2)**:
  - Updated `Scorer` interface: added `teamLogo?`, `league?`, `photoUrl?`
  - Updated `Standing` interface: added `teamLogo?`, `league?`
  - Updated `SidebarProps`: added optional `onPlayerClick` and `onTeamClick` callbacks
  - **TopScorers**: Added `onPlayerClick` callback with hover effects (neon underline + color), player photo via ClubLogo component, league filter dropdown (fetches from `/api/scorers?league=X`), animated dropdown with backdrop close
  - **LeagueTable**: Added `onTeamClick` callback, entire row clickable as button, team logo via ClubLogo, hover effects (neon color + underline), keyboard accessible
- **PlayerDetailModal**:
  - Added optional `playerName` prop for name-based lookups
  - When `playerName` is provided, fetches from `/api/player/by-name?name=X` instead of `/api/player/${id}`
  - Updated loading state logic to use `lookupKey` (name or ID)
- **page.tsx**:
  - Added `handlePlayerClick` callback: opens PlayerDetailModal with `playerName` for by-name lookup
  - Added `handleTeamClick` callback: navigates to `/team/{slug}`
  - Passed both callbacks to Sidebar component
  - Added PlayerDetailModal instance with `playerName` prop
- Lint passed cleanly, dev server compiling successfully

Stage Summary:
- Standings section now has 8 league tabs with colored glow effect on active tab
- Top Goalscorers names are clickable → opens PlayerDetailModal via name-based lookup
- LeagueTable rows are clickable → navigates to team page
- Player photos shown in scorers list, team logos in league table
- Scorers have league filter dropdown to view per-league top scorers
- All callbacks are optional — sidebar works without them
- PlayerDetailModal supports both ID-based and name-based player lookups

---
Task ID: 3
Agent: main
Task: Fix article images, data connection, and finalize all improvements

Work Log:
- Updated `/api/news/route.ts` with Unsplash fallback images for articles without imageUrl
  - Added 8 deterministic football-themed Unsplash images (stadium, match, field, etc.)
  - getFallbackImage() uses title hash for consistent image assignment
  - Added `limit` query parameter support
- Added `images.remotePatterns` to `next.config.ts` for Unsplash, Pexels, Wikimedia, api-sports.io domains
- Verified all APIs return correct data for new leagues (Bundesliga, Liga 1 Indonesia, Champions League, etc.)
- Confirmed WebSocket service (port 3003) and AI service (port 3005) are running
- REST API fallback works correctly when WS unavailable
- All lint checks pass, dev server compiling successfully with no errors

Stage Summary:
- Articles without images now show beautiful Unsplash football photos as fallback
- Next.js configured to allow remote images from Unsplash, Pexels, Wikimedia, api-sports.io
- Data connection is stable: WS primary + REST API fallback
- All 8 leagues fully functional with standings, scorers, and match data
