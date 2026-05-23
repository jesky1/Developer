"use client";

import { use, useState, useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Home,
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Target,
  Shield,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubLogo } from "@/components/ui/club-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/ad-slot";

/* ================================================================== */
/*  INTERFACES                                                        */
/* ================================================================== */

interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

interface Player {
  id: string;
  name: string;
  photoUrl: string;
  position: string;
  shirtNumber: number;
  nationality: string;
  age: number;
  rating: number;
  stats: PlayerStats | null;
}

interface SquadData {
  goalkeepers: Player[];
  defenders: Player[];
  midfielders: Player[];
  forwards: Player[];
}

interface TeamStats {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[];
  winRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
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
  kickoff: string;
  isHot: boolean;
}

interface TeamData {
  id: string;
  name: string;
  logo: string;
  league: string;
  stats: TeamStats;
  squad: SquadData;
  recentMatches: MatchData[];
  upcomingMatches: MatchData[];
}

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function getFormColor(result: string) {
  switch (result) {
    case "W":
      return "bg-neon/80 text-black font-bold";
    case "D":
      return "bg-yellow-500/80 text-black font-bold";
    case "L":
      return "bg-red-500/80 text-white font-bold";
    default:
      return "bg-surface-light text-muted-foreground";
  }
}

function getFormLabel(result: string) {
  switch (result) {
    case "W":
      return "W";
    case "D":
      return "D";
    case "L":
      return "L";
    default:
      return "-";
  }
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function getPositionGroupLabel(key: string): string {
  switch (key) {
    case "goalkeepers":
      return "Goalkeepers";
    case "defenders":
      return "Defenders";
    case "midfielders":
      return "Midfielders";
    case "forwards":
      return "Forwards";
    default:
      return key;
  }
}

function getPositionGroupIcon(key: string) {
  switch (key) {
    case "goalkeepers":
      return "🧤";
    case "defenders":
      return "🛡️";
    case "midfielders":
      return "⚙️";
    case "forwards":
      return "⚡";
    default:
      return "👤";
  }
}

/* ================================================================== */
/*  STATUS BADGE                                                       */
/* ================================================================== */

function MatchStatusBadge({
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
        className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-500/15 border border-green-500/30 rounded-full"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-green-400">
          LIVE {minute}&apos;
        </span>
      </motion.div>
    );
  }

  if (status === "HT") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-500/15 border border-yellow-500/30 rounded-full">
        <span className="text-[10px] font-bold text-yellow-400">HT</span>
      </div>
    );
  }

  if (status === "FT") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-surface-light border border-white/10 rounded-full">
        <span className="text-[10px] font-bold text-muted-foreground">FT</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full">
      <Clock className="w-2.5 h-2.5 text-blue-400" />
      <span className="text-[10px] font-bold text-blue-400">{kickoff}</span>
    </div>
  );
}

/* ================================================================== */
/*  STAT CARD                                                          */
/* ================================================================== */

function StatCard({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-3 sm:p-4 flex flex-col items-center gap-1.5 text-center"
    >
      <div className="text-neon/60">{icon}</div>
      <span className="text-lg sm:text-xl font-black tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
    </motion.div>
  );
}

/* ================================================================== */
/*  PLAYER CARD                                                        */
/* ================================================================== */

function PlayerCard({
  player,
  index,
}: {
  player: Player;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="glass-card p-3 flex items-center gap-3 hover:border-neon/20 transition-colors group"
    >
      {/* Photo or initials fallback */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-light border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (
                e.target as HTMLImageElement
              ).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <span
          className={`text-xs font-bold text-foreground/70 ${player.photoUrl ? "hidden" : ""
            }`}
        >
          {getInitials(player.name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {player.name}
          </span>
          {player.shirtNumber > 0 && (
            <span className="text-[10px] font-bold text-neon bg-neon/10 px-1.5 py-0.5 rounded">
              {player.shirtNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {player.nationality && (
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {player.nationality}
            </span>
          )}
          {player.position && (
            <span className="text-[10px] sm:text-xs text-muted-foreground/60">
              {player.position}
            </span>
          )}
        </div>
      </div>

      {/* Rating & Stats */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {player.rating > 0 && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${player.rating >= 7.5
                ? "bg-neon/15 text-neon border border-neon/30"
                : player.rating >= 6.5
                  ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                  : "bg-surface-light text-muted-foreground border border-white/10"
              }`}
          >
            {player.rating.toFixed(1)}
          </span>
        )}
        {player.stats && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {player.stats.goals > 0 && (
              <span className="flex items-center gap-0.5">
                ⚽ {player.stats.goals}
              </span>
            )}
            {player.stats.assists > 0 && (
              <span className="flex items-center gap-0.5">
                🅰️ {player.stats.assists}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MATCH ROW                                                          */
/* ================================================================== */

function MatchRow({
  match,
  isRecent,
  onClick,
  index,
}: {
  match: MatchData;
  isRecent: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="glass-card p-3 sm:p-4 w-full text-left hover:border-neon/20 transition-colors group"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubLogo
            name={match.homeTeam}
            src={match.homeLogo || undefined}
            size="sm"
          />
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {match.homeTeam}
          </span>
        </div>

        {/* Score / Status */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-2">
          {isRecent ? (
            <span className="text-sm sm:text-base font-black tabular-nums text-foreground">
              {match.homeScore} - {match.awayScore}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              vs
            </span>
          )}
          <MatchStatusBadge
            status={match.status}
            minute={match.minute}
            kickoff={match.kickoff}
          />
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate text-right">
            {match.awayTeam}
          </span>
          <ClubLogo
            name={match.awayTeam}
            src={match.awayLogo || undefined}
            size="sm"
          />
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-neon transition-colors shrink-0 ml-1" />
      </div>
    </motion.button>
  );
}

/* ================================================================== */
/*  LOADING SKELETON                                                   */
/* ================================================================== */

function TeamPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-2 border-b border-white/5 py-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  NOT FOUND STATE                                                    */
/* ================================================================== */

function TeamNotFound() {
  const { goBack } = useNavigation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <button
          onClick={() => goBack()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors" />
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
            Back
          </span>
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
          <h2 className="text-xl font-bold text-foreground">Team Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            The team you&apos;re looking for doesn&apos;t exist or may have been
            removed.
          </p>
          <button
            onClick={() => goBack()}
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

function TeamError({ onRetry }: { onRetry: () => void }) {
  const { goBack } = useNavigation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <button
          onClick={() => goBack()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors" />
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
            Back
          </span>
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
          <h2 className="text-xl font-bold text-foreground">
            Something Went Wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Failed to load team details. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => goBack()}
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

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { navigate, goBack, goHome } = useNavigation();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;

    async function fetchTeam() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/team/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setTeam(null);
            setError("not-found");
          } else {
            throw new Error("Failed to fetch team");
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setTeam(data);
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

    fetchTeam();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Cleanup state on unmount to prevent stale data on revisit
  useEffect(() => {
    return () => {
      setTeam(null);
      setError(null);
      setLoading(true);
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/team/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            setTeam(null);
            setError("not-found");
          } else {
            throw new Error("Failed to fetch team");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setTeam(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleMatchClick = (matchId: string) => {
    navigate(`/match/${matchId}`);
  };

  // Loading state
  if (loading) {
    return <TeamPageSkeleton />;
  }

  // Not found state
  if (error === "not-found" || (!team && !error)) {
    return <TeamNotFound />;
  }

  // Error state
  if (error) {
    return <TeamError onRetry={handleRetry} />;
  }

  if (!team) {
    return <TeamNotFound />;
  }

  const { stats, squad } = team;
  const squadGroups: { key: keyof SquadData; label: string; icon: string }[] = [
    { key: "goalkeepers", label: "Goalkeepers", icon: "🧤" },
    { key: "defenders", label: "Defenders", icon: "🛡️" },
    { key: "midfielders", label: "Midfielders", icon: "⚙️" },
    { key: "forwards", label: "Forwards", icon: "⚡" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ===== STICKY HEADER ===== */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => goBack()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors" />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
              Back
            </span>
          </button>
          <button
            onClick={() => goHome()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light/80 border border-white/10 hover:bg-neon/10 hover:border-neon/30 transition-colors group"
            aria-label="Go to Home"
          >
            <Home className="w-3.5 h-3.5 text-muted-foreground group-hover:text-neon transition-colors" />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-neon transition-colors">
              Home
            </span>
          </button>
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-b from-neon/5 to-transparent border-b border-white/5"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          {/* League badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="bg-neon/5 border-neon/20 text-neon text-[10px] sm:text-xs font-semibold uppercase tracking-wider gap-1.5"
            >
              <Trophy className="w-3 h-3" />
              {team.league}
            </Badge>
          </div>

          {/* Team logo + name */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ClubLogo
                name={team.name}
                src={team.logo || undefined}
                size="xl"
                variant="square"
                className="!w-20 !h-20 sm:!w-24 sm:!h-24"
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-2xl sm:text-3xl font-black text-foreground tracking-tight"
            >
              {team.name}
            </motion.h1>
          </div>

          {/* Key stats row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center justify-center gap-3 sm:gap-6"
          >
            {/* Position */}
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black text-neon tabular-nums">
                {stats.position}
                {stats.position === 1
                  ? "st"
                  : stats.position === 2
                    ? "nd"
                    : stats.position === 3
                      ? "rd"
                      : "th"}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Position
              </span>
            </div>

            <div className="w-px h-10 bg-white/10" />

            {/* Points */}
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                {stats.points}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Points
              </span>
            </div>

            <div className="w-px h-10 bg-white/10" />

            {/* W-D-L */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl font-bold text-neon tabular-nums">
                  {stats.won}
                </span>
                <span className="text-muted-foreground/40">-</span>
                <span className="text-lg sm:text-xl font-bold text-yellow-400 tabular-nums">
                  {stats.drawn}
                </span>
                <span className="text-muted-foreground/40">-</span>
                <span className="text-lg sm:text-xl font-bold text-red-400 tabular-nums">
                  {stats.lost}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                W-D-L
              </span>
            </div>
          </motion.div>

          {/* Current form */}
          {stats.form.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex items-center justify-center gap-1.5 mt-4"
            >
              <span className="text-[10px] text-muted-foreground/60 mr-1 uppercase tracking-wider font-medium">
                Form
              </span>
              {stats.form.map((result, i) => (
                <span
                  key={`form-${i}`}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${getFormColor(result)}`}
                >
                  {getFormLabel(result)}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Ad: Below hero — team detail top banner */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <AdSlot placement="article_top" format="horizontal" className="rounded-xl overflow-hidden" />
      </div>

      {/* ===== TABS ===== */}
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6 border-b border-white/5">
            <TabsList className="w-full bg-transparent h-11 p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="squad"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Squad
              </TabsTrigger>
              <TabsTrigger
                value="fixtures"
                className="flex-1 h-10 rounded-lg data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neon/50 transition-all text-xs sm:text-sm"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Fixtures
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="mt-0">
            <div className="px-4 sm:px-6 py-5 space-y-6">
              {/* Performance Stats Grid */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Performance
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                  <StatCard
                    icon={<Shield className="w-4 h-4" />}
                    label="Played"
                    value={stats.played}
                    delay={0}
                  />
                  <StatCard
                    icon={<Trophy className="w-4 h-4" />}
                    label="Won"
                    value={stats.won}
                    delay={0.05}
                  />
                  <StatCard
                    icon={<span className="text-sm">🤝</span>}
                    label="Drawn"
                    value={stats.drawn}
                    delay={0.1}
                  />
                  <StatCard
                    icon={<span className="text-sm">💔</span>}
                    label="Lost"
                    value={stats.lost}
                    delay={0.15}
                  />
                </div>
              </div>

              {/* Goals grid */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Goals
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <StatCard
                    icon={<Target className="w-4 h-4" />}
                    label="GF"
                    value={stats.gf}
                    delay={0.2}
                  />
                  <StatCard
                    icon={<Shield className="w-4 h-4" />}
                    label="GA"
                    value={stats.ga}
                    delay={0.25}
                  />
                  <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="GD"
                    value={stats.gd > 0 ? `+${stats.gd}` : stats.gd}
                    delay={0.3}
                  />
                </div>
              </div>

              {/* Win Rate Progress Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Win Rate
                  </span>
                  <span className="text-sm font-black text-neon tabular-nums">
                    {stats.winRate}%
                  </span>
                </div>
                <div className="h-3 bg-surface-light rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.winRate}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-neon/60 to-neon rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/50">
                  <span>{stats.won} wins</span>
                  <span>{stats.played} matches</span>
                </div>
              </motion.div>

              {/* Average Goals */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3.5 h-3.5 text-neon/60" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Avg Scored
                    </span>
                  </div>
                  <span className="text-xl font-black text-foreground tabular-nums">
                    {stats.avgGoalsScored}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    goals/game
                  </span>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5 text-red-400/60" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Avg Conceded
                    </span>
                  </div>
                  <span className="text-xl font-black text-foreground tabular-nums">
                    {stats.avgGoalsConceded}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    goals/game
                  </span>
                </div>
              </motion.div>

              {/* Current Form (detailed) */}
              {stats.form.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                  className="glass-card p-4"
                >
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Current Form
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {stats.form.map((result, i) => (
                      <motion.div
                        key={`form-detail-${i}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.5 + i * 0.08,
                          type: "spring",
                          stiffness: 300,
                        }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${getFormColor(result)}`}
                      >
                        {getFormLabel(result)}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* ===== SQUAD TAB ===== */}
          <TabsContent value="squad" className="mt-0">
            <div className="px-4 sm:px-6 py-5 space-y-6">
              {squadGroups.map((group) => {
                const players = squad[group.key];
                if (!players || players.length === 0) return null;

                return (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{group.icon}</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 bg-surface-light px-1.5 py-0.5 rounded">
                        {players.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {players.map((player, i) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          index={i}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* No players state */}
              {squadGroups.every(
                (g) => !squad[g.key] || squad[g.key].length === 0
              ) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-8 sm:p-12 text-center bg-surface-light/30 border border-white/5"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm font-medium">
                      No squad data available
                    </p>
                    <p className="text-white/20 text-xs mt-1">
                      Player information will appear here when available
                    </p>
                  </motion.div>
                )}
            </div>
          </TabsContent>

          {/* ===== FIXTURES TAB ===== */}
          <TabsContent value="fixtures" className="mt-0">
            <div className="px-4 sm:px-6 py-5 space-y-6">
              {/* Recent Results */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-neon/60" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Results
                  </span>
                </div>
                {team.recentMatches.length > 0 ? (
                  <div className="space-y-2">
                    {team.recentMatches.map((match, i) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        isRecent={true}
                        onClick={() => handleMatchClick(match.id)}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No recent results
                    </p>
                  </div>
                )}
              </div>

              {/* Upcoming Matches */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-neon/60" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Upcoming Matches
                  </span>
                </div>
                {team.upcomingMatches.length > 0 ? (
                  <div className="space-y-2">
                    {team.upcomingMatches.map((match, i) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        isRecent={false}
                        onClick={() => handleMatchClick(match.id)}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No upcoming matches scheduled
                    </p>
                  </div>
                )}
              </div>

              {/* No fixtures at all */}
              {team.recentMatches.length === 0 &&
                team.upcomingMatches.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-8 sm:p-12 text-center bg-surface-light/30 border border-white/5"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm font-medium">
                      No fixtures available
                    </p>
                    <p className="text-white/20 text-xs mt-1">
                      Match schedule will appear here when available
                    </p>
                  </motion.div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Ad: Team detail bottom banner */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <AdSlot placement="article_bottom" format="horizontal" className="rounded-xl overflow-hidden" />
      </div>
    </div>
  );
}
