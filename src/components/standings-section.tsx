"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubLogo } from "@/components/ui/club-logo";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/hooks/use-navigation";

// === Types ===

interface StandingRow {
  position: number;
  team: string;
  teamLogo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[];
  league: string;
}

// === League Config ===

const LEAGUES = [
  { name: "Premier League", country: "ENG", color: "bg-purple-500", glow: "shadow-purple-500/40" },
  { name: "La Liga", country: "ESP", color: "bg-orange-500", glow: "shadow-orange-500/40" },
  { name: "Serie A", country: "ITA", color: "bg-green-500", glow: "shadow-green-500/40" },
  { name: "Bundesliga", country: "GER", color: "bg-red-500", glow: "shadow-red-500/40" },
  { name: "Ligue 1", country: "FRA", color: "bg-blue-500", glow: "shadow-blue-500/40" },
  { name: "Champions League", country: "UCL", color: "bg-indigo-500", glow: "shadow-indigo-500/40" },
  { name: "Eredivisie", country: "NED", color: "bg-amber-500", glow: "shadow-amber-500/40" },
  { name: "Liga 1 Indonesia", country: "IDN", color: "bg-emerald-500", glow: "shadow-emerald-500/40" },
] as const;

type LeagueName = (typeof LEAGUES)[number]["name"];

// === Zone colors for position indicators ===

function getPositionZone(position: number, totalTeams: number) {
  // Champions League spots (1-4)
  if (position <= 4) return { bg: "bg-neon/15", text: "text-neon", border: "border-neon/30", dot: "bg-neon" };
  // Europa League (5-6)
  if (position <= 6) return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" };
  // Relegation (last 3)
  if (position > totalTeams - 3) return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500" };
  // Mid-table
  return { bg: "", text: "text-muted-foreground", border: "", dot: "bg-muted-foreground/30" };
}

// === Form Guide Badge ===

function FormBadge({ result }: { result: string }) {
  const config: Record<string, string> = {
    W: "bg-green-500/20 text-green-400 border-green-500/30",
    D: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    L: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 text-[9px] font-bold rounded-sm border ${config[result] || "bg-muted/20 text-muted-foreground border-border"}`}>
      {result}
    </span>
  );
}

// === Standing Table Row ===

function StandingRow({
  row,
  index,
  totalTeams,
  onTeamClick,
}: {
  row: StandingRow;
  index: number;
  totalTeams: number;
  onTeamClick: (teamName: string) => void;
}) {
  const zone = getPositionZone(row.position, totalTeams);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
      className={cn(
        "border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group",
        zone.bg && zone.bg
      )}
    >
      {/* Position */}
      <td className="py-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1 h-4 rounded-full shrink-0", zone.dot)} />
          <span className={cn("text-xs font-bold tabular-nums", zone.text)}>
            {row.position}
          </span>
        </div>
      </td>

      {/* Team */}
      <td className="py-2.5 px-1">
        <button
          onClick={() => onTeamClick(row.team)}
          className="flex items-center gap-2 group/team cursor-pointer"
          aria-label={`View ${row.team} details`}
        >
          <ClubLogo name={row.team} src={row.teamLogo} size="sm" />
          <span className="text-xs font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px] group-hover/team:underline group-hover/team:text-neon transition-colors">
            {row.team}
          </span>
        </button>
      </td>

      {/* P W D L */}
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums">{row.played}</td>
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums">{row.won}</td>
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums">{row.drawn}</td>
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums">{row.lost}</td>

      {/* GF GA GD */}
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">{row.gf}</td>
      <td className="py-2.5 px-1 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">{row.ga}</td>
      <td className={cn(
        "py-2.5 px-1 text-center text-xs font-medium tabular-nums hidden md:table-cell",
        row.gd > 0 ? "text-green-400" : row.gd < 0 ? "text-red-400" : "text-muted-foreground"
      )}>
        {row.gd > 0 ? `+${row.gd}` : row.gd}
      </td>

      {/* Points */}
      <td className="py-2.5 px-1 text-center text-xs font-bold text-foreground tabular-nums">{row.points}</td>

      {/* Form */}
      <td className="py-2.5 px-1 hidden lg:table-cell">
        <div className="flex items-center gap-0.5 justify-center">
          {Array.isArray(row.form) && row.form.map((r, fi) => (
            <FormBadge key={`form-${row.team}-${fi}`} result={r} />
          ))}
        </div>
      </td>
    </motion.tr>
  );
}

// === Skeleton Loader ===

function StandingsSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-6 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-4 w-6 rounded" />
              <Skeleton className="h-4 w-6 rounded" />
              <Skeleton className="h-4 w-6 rounded" />
              <Skeleton className="h-4 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Zone Legend ===

function ZoneLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-3 px-1">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-neon" />
        Champions League
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        Europa League
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Relegation
      </div>
    </div>
  );
}

// === Main Component ===

interface StandingsSectionProps {
  /** When set externally, overrides the internal active league */
  selectedLeague?: string;
}

export function StandingsSection({ selectedLeague }: StandingsSectionProps) {
  const [activeLeague, setActiveLeague] = useState<LeagueName>("Premier League");
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const { navigate } = useNavigation();

  // Respond to external league selection (e.g. from footer)
  useEffect(() => {
    if (selectedLeague) {
      const match = LEAGUES.find(
        (l) => l.name.toLowerCase() === selectedLeague.toLowerCase()
      );
      if (match) {
        setActiveLeague(match.name);
      }
    }
  }, [selectedLeague]);

  const handleTeamClick = useCallback((teamName: string) => {
    const slug = teamName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/team/${slug}`);
  }, [navigate]);

  const fetchStandings = useCallback(async (league: LeagueName) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/standings?league=${encodeURIComponent(league)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStandings(
        data.map((s: Record<string, unknown>) => ({
          position: (s.position as number) || 0,
          team: (s.team as string) || "",
          teamLogo: (s.teamLogo as string) || undefined,
          played: (s.played as number) || 0,
          won: (s.won as number) || 0,
          drawn: (s.drawn as number) || 0,
          lost: (s.lost as number) || 0,
          gf: (s.gf as number) || 0,
          ga: (s.ga as number) || 0,
          gd: (s.gd as number) || 0,
          points: (s.points as number) || 0,
          form: Array.isArray(s.form) ? s.form as string[] : [],
          league: (s.league as string) || league,
        }))
      );
    } catch {
      setStandings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings(activeLeague);
  }, [activeLeague, fetchStandings]);

  return (
    <section id="standings" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-lg font-bold text-foreground"
        >
          <Trophy className="w-5 h-5 text-neon" />
          League Standings
        </motion.h2>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>Collapse <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Expand <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      </div>

      {/* League Tabs — Horizontally scrollable with glow */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {LEAGUES.map((league) => {
            const isActive = activeLeague === league.name;
            return (
              <button
                key={league.name}
                onClick={() => setActiveLeague(league.name)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-[11px] font-semibold rounded-xl transition-all whitespace-nowrap snap-start cursor-pointer border",
                  isActive
                    ? `bg-white/[0.06] text-foreground border-white/[0.12] shadow-lg ${league.glow}`
                    : "bg-white/[0.02] text-muted-foreground border-transparent hover:bg-white/[0.05] hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all shrink-0",
                    league.color,
                    isActive && "animate-pulse"
                  )}
                />
                <span>{league.name}</span>
                <span className="text-[9px] text-muted-foreground/50">{league.country}</span>
              </button>
            );
          })}
        </div>
        {/* Scroll fade indicators */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none rounded-r-xl" />
      </div>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLeague}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          {isLoading ? (
            <div className="p-5">
              <StandingsSkeleton />
            </div>
          ) : isExpanded && standings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left py-3 px-1 w-8">#</th>
                    <th className="text-left py-3 px-1">Team</th>
                    <th className="text-center py-3 px-1 w-8">P</th>
                    <th className="text-center py-3 px-1 w-8">W</th>
                    <th className="text-center py-3 px-1 w-8">D</th>
                    <th className="text-center py-3 px-1 w-8">L</th>
                    <th className="text-center py-3 px-1 w-8 hidden sm:table-cell">GF</th>
                    <th className="text-center py-3 px-1 w-8 hidden sm:table-cell">GA</th>
                    <th className="text-center py-3 px-1 w-10 hidden md:table-cell">GD</th>
                    <th className="text-center py-3 px-1 w-10 font-bold">Pts</th>
                    <th className="text-center py-3 px-1 w-24 hidden lg:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <StandingRow
                      key={`standing-${row.team}-${i}`}
                      row={row}
                      index={i}
                      totalTeams={standings.length}
                      onTeamClick={handleTeamClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : !isExpanded ? (
            <div className="p-5 text-center text-muted-foreground text-xs">
              Table collapsed. Click &quot;Expand&quot; to view.
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No standings data available for {activeLeague}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Zone Legend */}
      {isExpanded && standings.length > 0 && <ZoneLegend />}
    </section>
  );
}
