"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, ChevronDown, Loader2 } from "lucide-react";
import { ClubLogo } from "@/components/ui/club-logo";
import { cn } from "@/lib/utils";

// === Types ===

interface Scorer {
  name: string;
  team: string;
  teamLogo?: string;
  goals: number;
  assists: number;
  matches: number;
  league?: string;
  photoUrl?: string;
}

interface Standing {
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
  league?: string;
}

interface SidebarProps {
  scorers: Scorer[];
  standings: Standing[];
  onPlayerClick?: (playerName: string) => void;
  onTeamClick?: (teamName: string) => void;
}

// === League filter options ===

const SCORER_LEAGUES = [
  { name: "All", value: "" },
  { name: "Premier League", value: "Premier League" },
  { name: "La Liga", value: "La Liga" },
  { name: "Serie A", value: "Serie A" },
  { name: "Bundesliga", value: "Bundesliga" },
  { name: "Ligue 1", value: "Ligue 1" },
  { name: "Champions League", value: "Champions League" },
  { name: "Eredivisie", value: "Eredivisie" },
  { name: "Liga 1 Indonesia", value: "Liga 1 Indonesia" },
] as const;

// === Top Goalscorers ===

function TopScorers({
  scorers,
  onPlayerClick,
}: {
  scorers: Scorer[];
  onPlayerClick?: (playerName: string) => void;
}) {
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leagueScorers, setLeagueScorers] = useState<Scorer[]>(scorers);
  const [isLeagueLoading, setIsLeagueLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch scorers filtered by league
  const fetchScorers = useCallback(async (league: string) => {
    setIsLeagueLoading(true);
    try {
      const url = league
        ? `/api/scorers?league=${encodeURIComponent(league)}`
        : `/api/scorers`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLeagueScorers(
        data.map((s: Record<string, unknown>) => ({
          name: (s.name as string) || "",
          team: (s.team as string) || "",
          teamLogo: (s.teamLogo as string) || undefined,
          goals: (s.goals as number) || 0,
          assists: (s.assists as number) || 0,
          matches: (s.matches as number) || 0,
          league: (s.league as string) || undefined,
          photoUrl: (s.photoUrl as string) || undefined,
        }))
      );
    } catch {
      // Fallback: use the original scorers prop filtered by league
      if (league) {
        setLeagueScorers(scorers.filter((s) => s.league === league));
      } else {
        setLeagueScorers(scorers);
      }
    } finally {
      setIsLeagueLoading(false);
    }
  }, [scorers]);

  useEffect(() => {
    fetchScorers(selectedLeague);
  }, [selectedLeague, fetchScorers]);

  // Update when parent scorers change (for "All" view)
  useEffect(() => {
    if (!selectedLeague) {
      setLeagueScorers(scorers);
    }
  }, [scorers, selectedLeague]);

  const activeLeagueLabel =
    SCORER_LEAGUES.find((l) => l.value === selectedLeague)?.name || "All";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Top Goalscorers
          </h3>
        </div>

        {/* League Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.15] transition-colors cursor-pointer"
          >
            <span>{activeLeagueLabel}</span>
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-background/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1">
                    {SCORER_LEAGUES.map((league) => (
                      <button
                        key={league.value}
                        onClick={() => {
                          setSelectedLeague(league.value);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer",
                          selectedLeague === league.value
                            ? "bg-neon/10 text-neon font-semibold"
                            : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                        )}
                      >
                        {league.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scorers List */}
      <div className="space-y-1 max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <AnimatePresence mode="wait">
          {isLeagueLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="w-5 h-5 text-neon animate-spin" />
            </motion.div>
          ) : leagueScorers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 text-xs text-muted-foreground"
            >
              No scorers found
            </motion.div>
          ) : (
            <motion.div
              key={selectedLeague || "all"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {leagueScorers.map((scorer, i) => (
                <motion.div
                  key={`${scorer.name}-${scorer.team}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors",
                    onPlayerClick
                      ? "hover:bg-white/[0.05] cursor-pointer group/scorer"
                      : "hover:bg-white/[0.03]"
                  )}
                  onClick={() => onPlayerClick?.(scorer.name)}
                  role={onPlayerClick ? "button" : undefined}
                  tabIndex={onPlayerClick ? 0 : undefined}
                  onKeyDown={
                    onPlayerClick
                      ? (e) => {
                          if (e.key === "Enter") onPlayerClick(scorer.name);
                        }
                      : undefined
                  }
                >
                  {/* Rank Badge */}
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      i === 0
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : i === 1
                        ? "bg-gray-400/20 text-gray-300 border border-gray-400/30"
                        : i === 2
                        ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                        : "bg-surface-light text-muted-foreground border border-white/10"
                    )}
                  >
                    {i + 1}
                  </span>

                  {/* Player Photo */}
                  <ClubLogo
                    name={scorer.name}
                    src={scorer.photoUrl}
                    size="sm"
                    variant="circle"
                  />

                  {/* Name + Team */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium truncate transition-colors",
                        onPlayerClick
                          ? "text-foreground group-hover/scorer:text-neon group-hover/scorer:underline underline-offset-2"
                          : "text-foreground"
                      )}
                    >
                      {scorer.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {scorer.team}
                    </p>
                  </div>

                  {/* Goals + Apps */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-neon">{scorer.goals}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {scorer.matches} apps
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// === League Table ===

function LeagueTable({
  standings,
  onTeamClick,
}: {
  standings: Standing[];
  onTeamClick?: (teamName: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-4 h-4 text-neon" />
        <h3 className="text-sm font-semibold text-foreground">League Table</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-white/5">
              <th className="text-left py-2 w-6">#</th>
              <th className="text-left py-2">Team</th>
              <th className="text-center py-2 w-7">P</th>
              <th className="text-center py-2 w-7">W</th>
              <th className="text-center py-2 w-7">D</th>
              <th className="text-center py-2 w-7">L</th>
              <th className="text-center py-2 w-8">GD</th>
              <th className="text-center py-2 w-8 font-bold">Pts</th>
              <th className="text-center py-2 w-16">Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => (
              <motion.tr
                key={team.team}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "border-b border-white/[0.03] transition-colors",
                  onTeamClick
                    ? "hover:bg-white/[0.05] cursor-pointer group/row"
                    : "hover:bg-white/[0.03]"
                )}
                onClick={() => onTeamClick?.(team.team)}
                role={onTeamClick ? "button" : undefined}
                tabIndex={onTeamClick ? 0 : undefined}
                onKeyDown={
                  onTeamClick
                    ? (e) => {
                        if (e.key === "Enter") onTeamClick(team.team);
                      }
                    : undefined
                }
              >
                <td className="py-2">
                  <span
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                      i < 4
                        ? "bg-neon/15 text-neon"
                        : i < 6
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {team.position}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <ClubLogo
                      name={team.team}
                      src={team.teamLogo}
                      size="xs"
                      variant="circle"
                    />
                    <span
                      className={cn(
                        "font-medium transition-colors truncate max-w-[100px]",
                        onTeamClick
                          ? "text-foreground group-hover/row:text-neon group-hover/row:underline underline-offset-2"
                          : "text-foreground"
                      )}
                    >
                      {team.team}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {team.played}
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {team.won}
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {team.drawn}
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {team.lost}
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {team.gd > 0 ? `+${team.gd}` : team.gd}
                </td>
                <td className="py-2 text-center font-bold text-foreground">
                  {team.points}
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-center gap-0.5">
                    {Array.isArray(team.form) &&
                      team.form.map((r, fi) => (
                        <span
                          key={fi}
                          className={cn(
                            "w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold",
                            r === "W"
                              ? "bg-green-500/20 text-green-400"
                              : r === "D"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {r}
                        </span>
                      ))}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// === Main Sidebar Component ===

export function Sidebar({
  scorers,
  standings,
  onPlayerClick,
  onTeamClick,
}: SidebarProps) {
  return (
    <div className="space-y-5">
      <TopScorers scorers={scorers} onPlayerClick={onPlayerClick} />
      <LeagueTable standings={standings} onTeamClick={onTeamClick} />
    </div>
  );
}
