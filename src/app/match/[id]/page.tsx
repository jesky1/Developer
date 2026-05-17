"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Play, Trophy, Flame, Home, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubLogo, LeagueLogo } from "@/components/ui/club-logo";
import { LineupTab } from "@/components/lineup-tab";
import { StatsTab } from "@/components/stats-tab";
import { PlayerDetailModal } from "@/components/player-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

/* ================================================================== */
/*  INTERFACES                                                        */
/* ================================================================== */

interface MatchEvent {
  type: string;
  team: string;
  player: string;
  minute: number;
}

interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  minute: number;
  league: string;
  leagueLogo: string;
  homeLogo: string;
  awayLogo: string;
  stadium: string;
  kickoff: string;
  isHot: boolean;
  events: MatchEvent[];
  homeForm: string[];
  awayForm: string[];
  poll: {
    homeVotes: number;
    drawVotes: number;
    awayVotes: number;
  } | null;
}

/* ================================================================== */
/*  MATCH DATA CACHE — persists across navigations within the session  */
/* ================================================================== */

const matchCache = new Map<string, { data: MatchData; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function getEventIcon(type: string) {
  switch (type) {
    case "goal": return "⚽";
    case "yellow": return "🟨";
    case "red": return "🟥";
    default: return "•";
  }
}

function getEventColor(type: string) {
  switch (type) {
    case "goal": return "text-neon bg-neon/15 border-neon/20";
    case "yellow": return "text-yellow-400 bg-yellow-500/15 border-yellow-500/20";
    case "red": return "text-red-400 bg-red-500/15 border-red-500/20";
    default: return "text-muted-foreground bg-surface-light border-white/10";
  }
}

/* ================================================================== */
/*  STATUS BADGE                                                       */
/* ================================================================== */

function StatusBadge({
  status,
  minute,
  kickoff,
}: {
  status: string;
  minute: number;
  kickoff: string;
}) {
  if (status === "LIVE") {
    return (
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex items-center gap-1.5 px-3 py-1 bg-green-500/15 border border-green-500/30 rounded-full"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-bold text-green-400">
          LIVE {minute}&apos;
        </span>
      </motion.div>
    );
  }

  if (status === "HT") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-full">
        <span className="text-xs font-bold text-yellow-400">Half Time</span>
      </div>
    );
  }

  if (status === "FT") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-light border border-white/10 rounded-full">
        <span className="text-xs font-bold text-muted-foreground">Full Time</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full">
      <Clock className="w-3 h-3 text-blue-400" />
      <span className="text-xs font-bold text-blue-400">{kickoff}</span>
    </div>
  );
}

/* ================================================================== */
/*  LOADING SKELETON                                                   */
/* ================================================================== */

function MatchPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Hero skeleton */}
      <div className="px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>

        <div className="flex items-center justify-center gap-6 py-4">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-6 w-4" />
            <Skeleton className="h-12 w-10" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="px-4">
        <div className="flex gap-2 border-b border-white/5 py-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  NOT FOUND STATE                                                    */
/* ================================================================== */

function MatchNotFound() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-full bg-surface-light/80 border border-white/10 flex items-center justify-center hover:bg-neon/10 hover:border-neon/30 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-surface-light border border-white/10 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Match Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            The match you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 rounded-lg bg-neon/10 border border-neon/30 text-neon text-sm font-semibold hover:bg-neon/20 transition-colors"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ERROR STATE                                                        */
/* ================================================================== */

function MatchError({ onRetry }: { onRetry: () => void }) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-full bg-surface-light/80 border border-white/10 flex items-center justify-center hover:bg-neon/10 hover:border-neon/30 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Something Went Wrong</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Failed to load match details. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleBack}
              className="px-4 py-2 rounded-lg bg-surface-light border border-white/10 text-muted-foreground text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-neon/10 border border-neon/30 text-neon text-sm font-semibold hover:bg-neon/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Player detail modal state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerLookupLoading, setPlayerLookupLoading] = useState(false);

  // Track if we've already navigated away to prevent double-nav
  const hasNavigatedRef = useRef(false);

  // Fetch match data with cache support
  useEffect(() => {
    let cancelled = false;

    async function fetchMatch() {
      // Check cache first
      const cached = matchCache.get(id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (!cancelled) {
          setMatch(cached.data);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setMatch(null);
            setError("not-found");
          } else {
            throw new Error("Failed to fetch match");
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMatch(data);
          // Cache the result
          matchCache.set(id, { data, timestamp: Date.now() });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMatch();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Player click handler - looks up player by name, then opens modal
  const handlePlayerClick = useCallback(async (playerName: string) => {
    setPlayerLookupLoading(true);
    try {
      const res = await fetch(`/api/player/by-name?name=${encodeURIComponent(playerName)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlayerId(data.id);
        setIsPlayerModalOpen(true);
      }
      // If not found, we silently ignore (player not in DB)
    } catch {
      // Silently ignore fetch errors
    } finally {
      setPlayerLookupLoading(false);
    }
  }, []);

  const handleClosePlayerModal = useCallback(() => {
    setIsPlayerModalOpen(false);
    // Delay clearing player ID so exit animation can play
    setTimeout(() => setSelectedPlayerId(null), 300);
  }, []);

  const handleRetry = () => {
    // Clear cache for this match and re-fetch
    matchCache.delete(id);
    setLoading(true);
    setError(null);
    fetch(`/api/matches/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            setMatch(null);
            setError("not-found");
          } else {
            throw new Error("Failed to fetch match");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setMatch(data);
          matchCache.set(id, { data, timestamp: Date.now() });
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Navigation handlers — use router.replace() to avoid history stacking
  const handleGoBack = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    // Use replace to avoid creating a new history entry
    // This prevents the "back button trap"
    router.replace("/");
  }, [router]);

  const handleGoHome = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.replace("/");
  }, [router]);

  // Loading state
  if (loading) {
    return <MatchPageSkeleton />;
  }

  // Not found state
  if (error === "not-found" || (!match && !error)) {
    return <MatchNotFound />;
  }

  // Error state
  if (error) {
    return <MatchError onRetry={handleRetry} />;
  }

  if (!match) {
    return <MatchNotFound />;
  }

  const goalEvents = match.events.filter((e) => e.type === "goal");
  const homeGoals = goalEvents.filter((e) => e.team === "home");
  const awayGoals = goalEvents.filter((e) => e.team === "away");

  return (
    <div className="min-h-screen bg-background">
      {/* ===== STICKY BACK BUTTON ===== */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors" />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
              Back
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
              aria-label="Go to Home"
            >
              <Home className="w-3.5 h-3.5 text-muted-foreground group-hover:text-neon transition-colors" />
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
                Home
              </span>
            </button>
            {match.isHot && (
              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-md uppercase">
                <Flame className="w-3 h-3" />
                Hot Match
              </span>
            )}
            {/* Player lookup loading indicator */}
            {playerLookupLoading && (
              <Loader2 className="w-3.5 h-3.5 text-neon animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* ===== HERO HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-b from-neon/5 to-transparent border-b border-white/5"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          {/* League & Status */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <LeagueLogo name={match.league} src={match.leagueLogo || undefined} size="xs" />
              <span className="text-xs sm:text-sm font-semibold text-neon uppercase tracking-wider">
                {match.league}
              </span>
            </div>
            <StatusBadge
              status={match.status}
              minute={match.minute}
              kickoff={match.kickoff}
            />
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <ClubLogo
                name={match.homeTeam}
                src={match.homeLogo || undefined}
                size="xl"
                variant="square"
              />
              <span className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[100px] sm:max-w-[160px]">
                {match.homeTeam}
              </span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-1.5 px-2 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <motion.span
                  key={`page-home-${match.homeScore}`}
                  initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                  animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                  className="text-4xl sm:text-6xl font-black tabular-nums"
                >
                  {match.homeScore}
                </motion.span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xl sm:text-3xl text-muted-foreground/40 font-light">-</span>
                </div>
                <motion.span
                  key={`page-away-${match.awayScore}`}
                  initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                  animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                  className="text-4xl sm:text-6xl font-black tabular-nums"
                >
                  {match.awayScore}
                </motion.span>
              </div>

              {/* Goal scorers mini */}
              <div className="flex gap-4 mt-1">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 max-w-[80px] sm:max-w-[120px] text-right truncate">
                  {homeGoals.map((g) => g.player.split(" ").pop()).join(", ")}
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 max-w-[80px] sm:max-w-[120px] truncate">
                  {awayGoals.map((g) => g.player.split(" ").pop()).join(", ")}
                </div>
              </div>

              {match.status === "LIVE" && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Play className="w-3 h-3 text-neon" />
                  <span className="text-[10px] text-muted-foreground">Match in progress</span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <ClubLogo
                name={match.awayTeam}
                src={match.awayLogo || undefined}
                size="xl"
                variant="square"
              />
              <span className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[100px] sm:max-w-[160px]">
                {match.awayTeam}
              </span>
            </div>
          </div>

          {/* Stadium & Kickoff Info */}
          <div className="flex items-center justify-center gap-4 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-neon/50" />
              <span>{match.stadium || "TBD"}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-neon/50" />
              <span>{match.kickoff}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== TABS ===== */}
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6 border-b border-white/5">
            <TabsList className="w-full bg-transparent h-11 p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <Trophy className="w-3.5 h-3.5 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="lineup"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Lineup
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                Stats
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="px-4 sm:px-6 py-5 space-y-6">
              {/* Match Timeline Bar */}
              <AnimatePresence>
                {goalEvents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Match Timeline
                    </div>
                    <div className="relative h-2 bg-surface-light rounded-full overflow-hidden">
                      <div className="absolute inset-0 flex">
                        {goalEvents.map((event, i) => {
                          const pct = Math.min((event.minute / 90) * 100, 100);
                          return (
                            <motion.div
                              key={`timeline-${i}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "100%", opacity: 1 }}
                              transition={{ delay: i * 0.15, duration: 0.3 }}
                              className="absolute top-0 w-1.5 bg-neon rounded-full -translate-x-1/2"
                              style={{ left: `${pct}%` }}
                              title={`${event.player} ${event.minute}'`}
                            />
                          );
                        })}
                      </div>
                      {/* Half-time marker */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">0&apos;</span>
                      <span className="text-[10px] text-muted-foreground">45&apos;</span>
                      <span className="text-[10px] text-muted-foreground">90&apos;</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* All Events */}
              <AnimatePresence>
                {match.events.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Match Events
                    </div>
                    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                      {match.events.map((event, i) => (
                        <motion.div
                          key={`event-${i}`}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center gap-2.5 text-xs p-2.5 rounded-lg hover:bg-surface-light/50 transition-colors ${
                            event.team === "away" ? "flex-row-reverse text-right" : ""
                          }`}
                        >
                          <span className="text-muted-foreground w-7 shrink-0 font-medium tabular-nums text-center">
                            {event.minute}&apos;
                          </span>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 border ${getEventColor(event.type)}`}
                          >
                            {getEventIcon(event.type)}
                          </span>
                          <span
                            className={`${
                              event.type === "goal"
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {event.player}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">
                            {event.team === "home" ? match.homeTeam : match.awayTeam}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No events placeholder */}
              {match.events.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl p-8 sm:p-12 text-center bg-surface-light/30 border border-white/5"
                >
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-medium">No events yet</p>
                  <p className="text-white/20 text-xs mt-1">
                    {match.status === "UPCOMING"
                      ? "Events will appear once the match starts"
                      : "Match events will be displayed here"}
                  </p>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Lineup Tab */}
          <TabsContent value="lineup" className="mt-0">
            <LineupTab
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              onPlayerClick={handlePlayerClick}
            />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-0">
            <StatsTab
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeLogo={match.homeLogo || undefined}
              awayLogo={match.awayLogo || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== PLAYER DETAIL MODAL ===== */}
      <PlayerDetailModal
        playerId={selectedPlayerId}
        isOpen={isPlayerModalOpen}
        onClose={handleClosePlayerModal}
      />
    </div>
  );
}
