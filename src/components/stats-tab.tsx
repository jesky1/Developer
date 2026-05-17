"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ArrowRightLeft,
  Shield,
  Swords,
  AlertTriangle,
  Target,
  HandMetal,
  Clock,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/lib/i18n";
import { ClubLogo } from "@/components/ui/club-logo";

// ==========================================
// Match Stats Tab (existing functionality)
// ==========================================

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

// ==========================================
// Player Stats Tab (new API-Football stats)
// ==========================================

interface PlayerStatsData {
  totalMatches: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passingAccuracy: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  season: string;
  // New API-Football fields
  passesTotal: number;
  passesKey: number;
  tacklesBlocks: number;
  duelsTotal: number;
  duelsWon: number;
  dribblesAttempts: number;
  dribblesSuccess: number;
  dribblesPast: number;
  foulsDrawn: number;
  foulsCommitted: number;
  yellowRedCards: number;
  penaltyWon: number;
  penaltyScored: number;
  penaltyMissed: number;
  goalsConceded: number;
  saves: number;
  penaltySaved: number;
  lineups: number;
  minutes: number;
  isCaptain: boolean;
  substitutesIn: number;
  substitutesOut: number;
}

interface PlayerStatsTabProps {
  stats: PlayerStatsData;
  position: string; // FW, MF, DF, GK
}

// Colored stat box used in player stats sections
function PlayerStatBox({
  label,
  value,
  maxValue,
  suffix = "",
  delay = 0,
  colorClass = "",
}: {
  label: string;
  value: number | string;
  maxValue?: number;
  suffix?: string;
  delay?: number;
  colorClass?: string;
}) {
  const numValue = typeof value === "number" ? value : 0;
  const percentage = maxValue && maxValue > 0 ? Math.min((numValue / maxValue) * 100, 100) : 0;
  const progressColor =
    percentage >= 80
      ? "[&>div]:bg-green-500"
      : percentage >= 60
      ? "[&>div]:bg-lime-500"
      : percentage >= 40
      ? "[&>div]:bg-yellow-500"
      : "[&>div]:bg-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`glass-card rounded-xl p-3 space-y-1.5`}
    >
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-lg font-bold ${colorClass || "text-foreground"}`}>
        {value}
        {suffix && <span className="text-xs text-muted-foreground font-normal ml-0.5">{suffix}</span>}
      </p>
      {maxValue !== undefined && maxValue > 0 && (
        <Progress value={percentage} className={`h-1.5 bg-surface-light ${progressColor}`} />
      )}
    </motion.div>
  );
}

// Section header
function SectionHeader({
  icon: Icon,
  title,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  delay?: number;
}) {
  return (
    <motion.h4
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mt-4 mb-2"
    >
      <Icon className="w-3.5 h-3.5" />
      {title}
    </motion.h4>
  );
}

export function PlayerStatsTab({ stats, position }: PlayerStatsTabProps) {
  const { t } = useTranslation();
  const isGK = position === "GK";
  const isFW = position === "FW";
  const isMF = position === "MF";
  const isAttacker = isFW || isMF;

  // Calculate derived percentage stats
  const dribbleSuccessRate =
    stats.dribblesAttempts > 0
      ? Math.round((stats.dribblesSuccess / stats.dribblesAttempts) * 100)
      : 0;

  const duelWinRate =
    stats.duelsTotal > 0
      ? Math.round((stats.duelsWon / stats.duelsTotal) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-0"
    >
      {/* ===== Core Stats (existing) ===== */}
      <SectionHeader icon={BarChart3} title={t('stats.coreStats')} delay={0} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <PlayerStatBox
          label={t('stats.matches')}
          value={stats.totalMatches}
          maxValue={40}
          delay={0.05}
        />
        <PlayerStatBox
          label={t('stats.goals')}
          value={stats.goals}
          maxValue={30}
          delay={0.08}
          colorClass={stats.goals > 10 ? "text-neon neon-text" : ""}
        />
        <PlayerStatBox
          label={t('stats.assists')}
          value={stats.assists}
          maxValue={20}
          delay={0.11}
          colorClass={stats.assists > 7 ? "text-neon neon-text" : ""}
        />
        <PlayerStatBox
          label={t('stats.shots')}
          value={stats.shots}
          maxValue={120}
          delay={0.14}
        />
        <PlayerStatBox
          label={t('stats.onTarget')}
          value={stats.shotsOnTarget}
          maxValue={70}
          delay={0.17}
        />
        <PlayerStatBox
          label={t('stats.passAcc')}
          value={Math.round(stats.passingAccuracy)}
          maxValue={100}
          suffix="%"
          delay={0.2}
        />
        <PlayerStatBox
          label={t('stats.tackles')}
          value={stats.tackles}
          maxValue={60}
          delay={0.23}
        />
        <PlayerStatBox
          label={t('stats.interceptions')}
          value={stats.interceptions}
          maxValue={40}
          delay={0.26}
        />
        <PlayerStatBox
          label={t('stats.fouls')}
          value={stats.fouls}
          maxValue={40}
          delay={0.29}
        />
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t('stats.yellowCards')}</p>
            <p className="text-lg font-bold text-yellow-400">{stats.yellowCards}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <div className="w-3 h-4 bg-red-400 rounded-sm" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t('stats.redCards')}</p>
            <p className="text-lg font-bold text-red-400">{stats.redCards}</p>
          </div>
        </div>
      </div>

      {/* ===== Passing Section ===== */}
      <SectionHeader icon={Send} title={t('stats.passing')} delay={0.32} />
      <div className="grid grid-cols-3 gap-2.5">
        <PlayerStatBox
          label={t('stats.totalPasses')}
          value={stats.passesTotal}
          maxValue={2000}
          delay={0.35}
        />
        <PlayerStatBox
          label={t('stats.keyPasses')}
          value={stats.passesKey}
          maxValue={80}
          delay={0.38}
          colorClass="text-green-400"
        />
        <PlayerStatBox
          label={t('stats.passAcc')}
          value={Math.round(stats.passingAccuracy)}
          maxValue={100}
          suffix="%"
          delay={0.41}
        />
      </div>

      {/* ===== Defending Section ===== */}
      <SectionHeader icon={Shield} title={t('stats.defending')} delay={0.44} />
      <div className="grid grid-cols-3 gap-2.5">
        <PlayerStatBox
          label={t('stats.tackles')}
          value={stats.tackles}
          maxValue={60}
          delay={0.47}
        />
        <PlayerStatBox
          label={t('stats.tacklesBlocks')}
          value={stats.tacklesBlocks}
          maxValue={30}
          delay={0.5}
        />
        <PlayerStatBox
          label={t('stats.interceptions')}
          value={stats.interceptions}
          maxValue={40}
          delay={0.53}
        />
      </div>

      {/* ===== Duels & Dribbles Section ===== */}
      <SectionHeader icon={Swords} title={t('stats.duelsDribbles')} delay={0.56} />
      <div className="grid grid-cols-3 gap-2.5">
        <PlayerStatBox
          label={t('stats.duelsWon')}
          value={`${stats.duelsWon}/${stats.duelsTotal}`}
          delay={0.59}
          colorClass="text-blue-400"
        />
        <PlayerStatBox
          label={t('stats.dribbleSuccess')}
          value={`${dribbleSuccessRate}%`}
          maxValue={100}
          delay={0.62}
          colorClass="text-green-400"
        />
        <PlayerStatBox
          label={t('stats.dribblesPast')}
          value={stats.dribblesPast}
          maxValue={30}
          delay={0.65}
        />
      </div>
      {/* Duels win rate bar */}
      {stats.duelsTotal > 0 && (
        <div className="mt-2.5 glass-card rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">{t('stats.duelWinRate')}</p>
            <p className="text-sm font-bold text-blue-400">{duelWinRate}%</p>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-surface-light">
            <div
              className="rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${duelWinRate}%` }}
            />
            <div
              className="rounded-full bg-surface-light transition-all duration-500"
              style={{ width: `${100 - duelWinRate}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>{t('stats.won')} {stats.duelsWon}</span>
            <span>{t('stats.total')} {stats.duelsTotal}</span>
          </div>
        </div>
      )}

      {/* ===== Discipline Section ===== */}
      <SectionHeader icon={AlertTriangle} title={t('stats.discipline')} delay={0.68} />
      <div className="grid grid-cols-3 gap-2.5">
        <PlayerStatBox
          label={t('stats.foulsDrawn')}
          value={stats.foulsDrawn}
          maxValue={50}
          delay={0.71}
        />
        <PlayerStatBox
          label={t('stats.foulsCommitted')}
          value={stats.foulsCommitted}
          maxValue={40}
          delay={0.74}
        />
        <div className="glass-card rounded-xl p-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="w-2.5 h-1.5 bg-yellow-400 rounded-sm" />
              <div className="w-2.5 h-1.5 bg-red-400 rounded-sm" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t('stats.yellowRedCards')}</p>
            <p className="text-lg font-bold text-orange-400">{stats.yellowRedCards}</p>
          </div>
        </div>
      </div>

      {/* ===== Penalty Section (FW/MF only) ===== */}
      {isAttacker && (
        <>
          <SectionHeader icon={Target} title={t('stats.penalty')} delay={0.77} />
          <div className="grid grid-cols-3 gap-2.5">
            <PlayerStatBox
              label={t('stats.penaltyWon')}
              value={stats.penaltyWon}
              maxValue={10}
              delay={0.8}
              colorClass="text-green-400"
            />
            <PlayerStatBox
              label={t('stats.penaltyScored')}
              value={stats.penaltyScored}
              maxValue={10}
              delay={0.83}
              colorClass="text-neon"
            />
            <PlayerStatBox
              label={t('stats.penaltyMissed')}
              value={stats.penaltyMissed}
              maxValue={5}
              delay={0.86}
              colorClass="text-red-400"
            />
          </div>
          {/* Penalty conversion rate */}
          {(stats.penaltyScored + stats.penaltyMissed) > 0 && (
            <div className="mt-2.5 glass-card rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{t('stats.penaltyConversion')}</p>
                <p className="text-sm font-bold text-neon">
                  {Math.round(
                    (stats.penaltyScored / (stats.penaltyScored + stats.penaltyMissed)) * 100
                  )}
                  %
                </p>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-surface-light">
                <div
                  className="rounded-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (stats.penaltyScored / (stats.penaltyScored + stats.penaltyMissed)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>{t('stats.scored')} {stats.penaltyScored}</span>
                <span>{t('stats.missed')} {stats.penaltyMissed}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== Goalkeeping Section (GK only) ===== */}
      {isGK && (
        <>
          <SectionHeader icon={HandMetal} title={t('stats.goalkeeping')} delay={0.77} />
          <div className="grid grid-cols-3 gap-2.5">
            <PlayerStatBox
              label={t('stats.goalsConceded')}
              value={stats.goalsConceded}
              maxValue={50}
              delay={0.8}
              colorClass="text-red-400"
            />
            <PlayerStatBox
              label={t('stats.saves')}
              value={stats.saves}
              maxValue={100}
              delay={0.83}
              colorClass="text-green-400"
            />
            <PlayerStatBox
              label={t('stats.penaltySaved')}
              value={stats.penaltySaved}
              maxValue={10}
              delay={0.86}
              colorClass="text-neon"
            />
          </div>
        </>
      )}

      {/* ===== Match Info Section ===== */}
      <SectionHeader icon={Clock} title={t('stats.matchInfo')} delay={0.89} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <PlayerStatBox
          label={t('stats.lineups')}
          value={stats.lineups}
          maxValue={stats.totalMatches || 40}
          delay={0.92}
        />
        <PlayerStatBox
          label={t('stats.minutesPlayed')}
          value={stats.minutes}
          suffix={t('stats.min')}
          maxValue={3600}
          delay={0.95}
          colorClass="text-foreground"
        />
        <div className="glass-card rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground">{t('stats.captain')}</p>
          <p className={`text-lg font-bold ${stats.isCaptain ? "text-neon" : "text-muted-foreground"}`}>
            {stats.isCaptain ? "✓" : "—"}
          </p>
        </div>
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between">
          <p className="text-[10px] text-muted-foreground">{t('stats.subInSubOut')}</p>
          <div className="flex items-center gap-2">
            <div className="text-center">
              <p className="text-xs text-green-400 font-bold">↓{stats.substitutesIn}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-red-400 font-bold">↑{stats.substitutesOut}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
