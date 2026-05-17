"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Play, Trophy, Flame } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ClubLogo, LeagueLogo } from "@/components/ui/club-logo";
import { LineupTab } from "@/components/lineup-tab";
import { StatsTab } from "@/components/stats-tab";

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
  leagueLogo?: string;
  homeLogo?: string;
  awayLogo?: string;
  stadium: string;
  kickoff: string;
  events: MatchEvent[];
  isHot: boolean;
}

interface MatchDetailModalProps {
  match: MatchData | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayerClick: (playerName: string) => void;
}

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

export function MatchDetailModal({
  match,
  isOpen,
  onClose,
  onPlayerClick,
}: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [prevMatchId, setPrevMatchId] = useState<string | null>(null);

  // Reset to overview tab when a different match is opened
  if (match && match.id !== prevMatchId && isOpen) {
    setPrevMatchId(match.id);
    setActiveTab("overview");
  }

  if (!match) return null;

  const goalEvents = match.events.filter((e) => e.type === "goal");
  const homeGoals = goalEvents.filter((e) => e.team === "home");
  const awayGoals = goalEvents.filter((e) => e.team === "away");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 bg-transparent border-none shadow-none max-w-4xl w-full overflow-hidden"
      >
        <DialogTitle className="sr-only">
          {match ? `${match.homeTeam} vs ${match.awayTeam} Match Details` : "Match Details"}
        </DialogTitle>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="match-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card rounded-2xl max-h-[92vh] overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {/* ===== HERO HEADER ===== */}
              <div className="relative bg-gradient-to-b from-neon/5 to-transparent">
                {/* Close Button */}
                <div className="sticky top-0 z-10 flex justify-end p-3">
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-surface-light/80 border border-white/10 flex items-center justify-center hover:bg-neon/10 hover:border-neon/30 transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* League & Status */}
                <div className="flex items-center justify-between px-6 -mt-4 mb-3">
                  <div className="flex items-center gap-2">
                    {match.leagueLogo && (
                      <LeagueLogo name={match.league} src={match.leagueLogo} size="xs" />
                    )}
                    <span className="text-xs font-semibold text-neon uppercase tracking-wider">
                      {match.league}
                    </span>
                    {match.isHot && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-md uppercase">
                        <Flame className="w-3 h-3" />
                        Hot
                      </span>
                    )}
                  </div>
                  <StatusBadge status={match.status} minute={match.minute} kickoff={match.kickoff} />
                </div>

                {/* Score Display */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 py-4 px-4">
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <ClubLogo name={match.homeTeam} src={match.homeLogo} size="xl" variant="square" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[100px] sm:max-w-[140px]">
                      {match.homeTeam}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center gap-1.5 px-2 sm:px-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                      <motion.span
                        key={`modal-home-${match.homeScore}`}
                        initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                        animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                        className="text-4xl sm:text-5xl font-black tabular-nums"
                      >
                        {match.homeScore}
                      </motion.span>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg sm:text-2xl text-muted-foreground/40 font-light">-</span>
                      </div>
                      <motion.span
                        key={`modal-away-${match.awayScore}`}
                        initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                        animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                        className="text-4xl sm:text-5xl font-black tabular-nums"
                      >
                        {match.awayScore}
                      </motion.span>
                    </div>

                    {/* Goal scorers mini */}
                    <div className="flex gap-4 mt-1">
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 max-w-[80px] sm:max-w-[120px] text-right truncate">
                        {homeGoals.map(g => g.player.split(" ").pop()).join(", ")}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 max-w-[80px] sm:max-w-[120px] truncate">
                        {awayGoals.map(g => g.player.split(" ").pop()).join(", ")}
                      </div>
                    </div>

                    {match.status === "LIVE" && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Play className="w-3 h-3 text-neon" />
                        <span className="text-[10px] text-muted-foreground">Match in progress</span>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <ClubLogo name={match.awayTeam} src={match.awayLogo} size="xl" variant="square" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[100px] sm:max-w-[140px]">
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Stadium & Match Info */}
                <div className="flex items-center justify-center gap-4 pb-4 text-xs text-muted-foreground">
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

              {/* ===== TABS ===== */}
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
                  <div className="px-4 sm:px-6 py-4 space-y-5">
                    {/* Goal Timeline Bar */}
                    {goalEvents.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Match Timeline
                        </div>
                        <div className="relative h-2 bg-surface-light rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex">
                            {goalEvents.map((event, i) => {
                              const pct = Math.min((event.minute / 90) * 100, 100);
                              return (
                                <motion.div
                                  key={i}
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
                      </div>
                    )}

                    {/* All Events */}
                    {match.events.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Match Events
                        </div>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {match.events.map((event, i) => (
                            <motion.div
                              key={i}
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
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Lineup Tab */}
                <TabsContent value="lineup" className="mt-0">
                  <LineupTab
                    matchId={match.id}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    onPlayerClick={onPlayerClick}
                  />
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="mt-0">
                  <StatsTab
                    matchId={match.id}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

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
