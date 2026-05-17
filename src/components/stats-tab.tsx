"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { ClubLogo } from "@/components/ui/club-logo";

interface MatchStatsData {
  id: string;
  matchId: string;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeOffsides: number;
  awayOffsides: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homePassAccuracy: number;
  awayPassAccuracy: number;
}

interface StatsTabProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
}

export function StatsTab({ matchId, homeTeam, awayTeam, homeLogo, awayLogo }: StatsTabProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MatchStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/match-stats?fixtureId=${encodeURIComponent(matchId)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch stats");
        }
        const data = await res.json();
        setStats(data);
      } catch {
        setError(t('stats.unavailable'));
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [matchId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">{t('stats.matchUnavailable')}</p>
        <p className="text-xs mt-1 opacity-60">{t('stats.appearWhenLive')}</p>
      </div>
    );
  }

  const statRows: StatRow[] = [
    { label: t('stats.possession'), home: stats.homePossession, away: stats.awayPossession, isPercent: true },
    { label: t('stats.shots'), home: stats.homeShots, away: stats.awayShots },
    { label: t('stats.shotsOnTarget'), home: stats.homeShotsOnTarget, away: stats.awayShotsOnTarget },
    { label: t('stats.passAccuracy'), home: stats.homePassAccuracy, away: stats.awayPassAccuracy, isPercent: true },
    { label: t('stats.corners'), home: stats.homeCorners, away: stats.awayCorners },
    { label: t('stats.fouls'), home: stats.homeFouls, away: stats.awayFouls },
    { label: t('stats.offsides'), home: stats.homeOffsides, away: stats.awayOffsides },
    { label: t('stats.yellowCards'), home: stats.homeYellowCards, away: stats.awayYellowCards },
    { label: t('stats.redCards'), home: stats.homeRedCards, away: stats.awayRedCards },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-1"
    >
      {/* Team Headers */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClubLogo name={homeTeam} src={homeLogo || undefined} size="sm" />
          <span className="text-sm font-semibold text-foreground">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{awayTeam}</span>
          <ClubLogo name={awayTeam} src={awayLogo || undefined} size="sm" />
        </div>
      </div>

      {/* Stat Rows */}
      {statRows.map((row, i) => (
        <StatBar key={row.label} stat={row} delay={i * 0.05} />
      ))}
    </motion.div>
  );
}

interface StatRow {
  label: string;
  home: number;
  away: number;
  isPercent?: boolean;
}

function StatBar({ stat, delay }: { stat: StatRow; delay: number }) {
  const total = stat.home + stat.away;
  const homePercent = total > 0 ? (stat.home / total) * 100 : 50;
  const awayPercent = total > 0 ? (stat.away / total) * 100 : 50;
  const homeWinning = stat.home > stat.away;
  const awayWinning = stat.away > stat.home;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="space-y-1.5 py-2"
    >
      <div className="flex items-center justify-between text-xs">
        <span className={`font-bold tabular-nums ${homeWinning ? "text-neon" : "text-foreground"}`}>
          {stat.isPercent ? stat.home.toFixed(0) : stat.home}
        </span>
        <span className="text-muted-foreground font-medium">{stat.label}</span>
        <span className={`font-bold tabular-nums ${awayWinning ? "text-neon" : "text-foreground"}`}>
          {stat.isPercent ? stat.away.toFixed(0) : stat.away}
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-light gap-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          transition={{ delay: delay + 0.1, duration: 0.4, ease: "easeOut" }}
          className={`rounded-full ${homeWinning ? "bg-neon" : "bg-neon/40"}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${awayPercent}%` }}
          transition={{ delay: delay + 0.1, duration: 0.4, ease: "easeOut" }}
          className={`rounded-full ${awayWinning ? "bg-neon" : "bg-neon/40"}`}
        />
      </div>
    </motion.div>
  );
}
