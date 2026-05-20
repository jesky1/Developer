"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Play } from "lucide-react";
import { ClubLogo } from "@/components/ui/club-logo";

interface MatchEvent {
  type: string;
  team: string;
  player: string;
  minute: number;
}

interface FeaturedMatchProps {
  match: {
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
  } | null;
  goalFlash?: boolean;
}

export function FeaturedMatch({ match, goalFlash }: FeaturedMatchProps) {
  if (!match) {
    return (
      <div className="glass-card neon-glow rounded-2xl p-6 space-y-6 animate-pulse">
        <div className="h-6 bg-surface-light rounded w-1/3" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-surface-light rounded-full" />
            <div className="w-20 h-4 bg-surface-light rounded" />
          </div>
          <div className="w-24 h-10 bg-surface-light rounded" />
          <div className="space-y-2">
            <div className="w-16 h-16 bg-surface-light rounded-full" />
            <div className="w-20 h-4 bg-surface-light rounded" />
          </div>
        </div>
      </div>
    );
  }

  const goalEvents = match.events.filter((e) => e.type === "goal");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: goalFlash ? [1, 1.02, 1] : 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`glass-card neon-glow-strong rounded-2xl overflow-hidden relative ${goalFlash ? "goal-flash-border" : ""}`}
    >
      {/* Goal flash overlay */}
      {goalFlash && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-neon/10 pointer-events-none z-10"
        />
      )}
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neon uppercase tracking-wider">
            {match.league}
          </span>
          {match.isHot && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-md uppercase">
              🔥 Hot
            </span>
          )}
          {goalFlash && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-1.5 py-0.5 text-[10px] font-black bg-neon/20 text-neon border border-neon/30 rounded-md uppercase goal-pulse-text"
            >
              ⚽ GOAL!
            </motion.span>
          )}
        </div>
        {match.status === "LIVE" && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-500/15 border border-green-500/30 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 live-pulse" />
            <span className="text-xs font-bold text-green-400">
              LIVE {match.minute}&apos;
            </span>
          </motion.div>
        )}
        {match.status === "HT" && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-full">
            <span className="text-xs font-bold text-yellow-400">Half Time</span>
          </div>
        )}
        {match.status === "FT" && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-light border border-white/10 rounded-full">
            <span className="text-xs font-bold text-muted-foreground">Full Time</span>
          </div>
        )}
        {match.status === "UPCOMING" && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-bold text-blue-400">{match.kickoff}</span>
          </div>
        )}
      </div>

      {/* Teams & Score */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <ClubLogo
              name={match.homeTeam}
              src={match.homeLogo || undefined}
              size="lg"
              variant="circle"
            />
            <span className="text-sm font-semibold text-foreground text-center">
              {match.homeTeam}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-2 px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <motion.span
                key={`home-${match.homeScore}`}
                initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                className="text-4xl font-bold tabular-nums"
              >
                {match.homeScore}
              </motion.span>
              <span className="text-2xl text-muted-foreground">:</span>
              <motion.span
                key={`away-${match.awayScore}`}
                initial={{ scale: 1.4, color: "oklch(0.72 0.22 155)" }}
                animate={{ scale: 1, color: "oklch(0.95 0.01 260)" }}
                className="text-4xl font-bold tabular-nums"
              >
                {match.awayScore}
              </motion.span>
            </div>
            {match.status === "LIVE" && (
              <div className="flex items-center gap-2">
                <Play className="w-3 h-3 text-neon" />
                <span className="text-xs text-muted-foreground">
                  Match in progress
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <ClubLogo
              name={match.awayTeam}
              src={match.awayLogo || undefined}
              size="lg"
              variant="circle"
            />
            <span className="text-sm font-semibold text-foreground text-center">
              {match.awayTeam}
            </span>
          </div>
        </div>
      </div>

      {/* Goal Timeline Bar */}
      {goalEvents.length > 0 && (
        <div className="px-4 sm:px-6 pb-4">
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
                    className="absolute top-0 w-1 bg-neon rounded-full"
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

      {/* Events List */}
      {match.events.length > 0 && (
        <div className="px-4 sm:px-6 pb-5 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {match.events.map((event, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-2 text-xs ${event.team === "home" ? "" : "flex-row-reverse text-right"
                  }`}
              >
                <span className="text-muted-foreground w-8 shrink-0">
                  {event.minute}&apos;
                </span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${event.type === "goal"
                    ? "bg-neon/20 text-neon"
                    : event.type === "yellow"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : event.type === "red"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-surface-light text-muted-foreground"
                  }`}>
                  {event.type === "goal" ? "⚽" : event.type === "yellow" ? "🟨" : event.type === "red" ? "🟥" : "•"}
                </span>
                <span className={`${event.type === "goal" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {event.player}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Stadium */}
      <div className="px-4 sm:px-6 py-3 border-t border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>{match.stadium}</span>
      </div>
    </motion.div>
  );
}
