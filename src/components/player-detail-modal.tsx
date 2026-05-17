"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  CalendarDays,
  Flag,
  Ruler,
  ArrowRight,
  TrendingUp,
  Target,
  Shield,
  Weight,
  MapPin,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClubLogo } from "@/components/ui/club-logo";
import { useTranslation } from "@/lib/i18n";

interface PlayerDetailModalProps {
  playerId: string | null;
  playerName?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MatchRating {
  match: string;
  rating: number;
  opponent: string;
}

interface PlayerStats {
  id: string;
  playerId: string;
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
  matchRatings: MatchRating[];
}

interface Transfer {
  id: string;
  playerId: string;
  fromClub: string;
  toClub: string;
  fromLogo: string;
  toLogo: string;
  date: string;
  fee: string;
  type: string;
}

interface PlayerData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  age: number;
  birthDate: string;
  nationality: string;
  height: string;
  weight: string;
  position: string;
  shirtNumber: number;
  currentClub: string;
  clubLogo: string;
  rating: number;
  stats: PlayerStats | null;
  transfers: Transfer[];
}

function getPositionColor(position: string) {
  switch (position) {
    case "GK":
      return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", avatarBg: "bg-yellow-500/30", gradient: "from-yellow-500/20" };
    case "DF":
      return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", avatarBg: "bg-blue-500/30", gradient: "from-blue-500/20" };
    case "MF":
      return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", avatarBg: "bg-green-500/30", gradient: "from-green-500/20" };
    case "FW":
      return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", avatarBg: "bg-red-500/30", gradient: "from-red-500/20" };
    default:
      return { bg: "bg-surface-light", text: "text-muted-foreground", border: "border-white/10", avatarBg: "bg-surface-light", gradient: "from-white/5" };
  }
}

function getRatingColor(rating: number) {
  if (rating >= 8.0) return "bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.5)]";
  if (rating >= 7.0) return "bg-lime-500 text-black";
  if (rating >= 6.0) return "bg-yellow-500 text-black";
  return "bg-red-500 text-white";
}

function getRatingTextColor(rating: number) {
  if (rating >= 8.0) return "text-green-400";
  if (rating >= 7.0) return "text-lime-400";
  if (rating >= 6.0) return "text-yellow-400";
  return "text-red-400";
}

function getTransferTypeBadge(type: string) {
  switch (type) {
    case "Free": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Loan": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Youth": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default: return "bg-surface-light text-muted-foreground border-white/10";
  }
}

function getInitials(firstName: string, lastName: string, name: string) {
  if (firstName && lastName) return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  return name.charAt(0).toUpperCase();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="relative h-40 flex items-end p-5">
        <div className="flex items-end gap-4 w-full">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Info grid skeleton */}
      <div className="grid grid-cols-2 gap-2.5 px-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="px-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="px-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

// Stat card with progress bar
function StatCard({
  label,
  value,
  maxValue,
  icon: Icon,
  suffix = "",
  delay = 0,
  highlight = false,
}: {
  label: string;
  value: number;
  maxValue: number;
  icon?: React.ComponentType<{ className?: string }>;
  suffix?: string;
  delay?: number;
  highlight?: boolean;
}) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const progressColor = percentage >= 80 ? "[&>div]:bg-green-500" : percentage >= 60 ? "[&>div]:bg-lime-500" : percentage >= 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`glass-card rounded-xl p-3.5 space-y-2 ${highlight ? "neon-glow border-neon/30" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
        <p className={`text-lg font-bold ${highlight ? "text-neon neon-text" : "text-foreground"}`}>
          {value}{suffix && <span className="text-xs text-muted-foreground font-normal ml-0.5">{suffix}</span>}
        </p>
      </div>
      <Progress value={percentage} className={`h-1.5 bg-surface-light ${progressColor}`} />
    </motion.div>
  );
}

interface FetchState {
  player: PlayerData | null;
  error: string | null;
  fetchingId: string | null;
}

export function PlayerDetailModal({
  playerId,
  playerName,
  isOpen,
  onClose,
}: PlayerDetailModalProps) {
  const { t } = useTranslation();
  const [fetchState, setFetchState] = useState<FetchState>({
    player: null,
    error: null,
    fetchingId: null,
  });

  // Use playerName for lookup if provided, otherwise use playerId
  const lookupKey = playerName || playerId;

  useEffect(() => {
    if (!isOpen || !lookupKey) return;

    let cancelled = false;
    const fetchId = lookupKey;

    // If playerName is provided, use by-name endpoint; otherwise use ID endpoint
    const url = playerName
      ? `/api/player/by-name?name=${encodeURIComponent(playerName)}`
      : `/api/player/${playerId}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch player");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setFetchState({ player: data, error: null, fetchingId: fetchId });
        }
      })
      .catch((err) => {
        console.error("Error fetching player:", err);
        if (!cancelled) {
          setFetchState({ player: null, error: t('player.loadFailed'), fetchingId: fetchId });
        }
      });

    return () => { cancelled = true; };
  }, [isOpen, playerId, playerName, lookupKey]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFetchState({ player: null, error: null, fetchingId: null });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const isLoading = isOpen && lookupKey !== null && fetchState.fetchingId !== lookupKey && !fetchState.player && !fetchState.error;
  const player = fetchState.player;
  const error = fetchState.error;

  const positionColors = player ? getPositionColor(player.position) : getPositionColor("");
  const overallRating = player?.stats?.rating ?? player?.rating ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Panel - Slide from right */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] md:w-[520px] flex flex-col bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-light/80 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-surface-light transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {isLoading && <LoadingSkeleton />}

              {error && (
                <div className="p-6 flex flex-col items-center justify-center gap-3 min-h-[300px]">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <button onClick={onClose} className="text-xs text-neon hover:underline">{t('common.close')}</button>
                </div>
              )}

              {player && !isLoading && (
                <div className="space-y-0">
                  {/* ===== HERO HEADER (Sofascore style) ===== */}
                  <div className={`relative bg-gradient-to-b ${positionColors.gradient} to-transparent p-5 pt-10`}>
                    {/* Decorative background number */}
                    <div className="absolute top-4 right-6 text-7xl font-black text-white/[0.03] leading-none select-none">
                      {player.shirtNumber || ""}
                    </div>

                    <div className="flex items-end gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <ClubLogo
                          name={player.name}
                          src={player.photoUrl || undefined}
                          size="xl"
                          variant="square"
                          className={`!w-20 !h-20 sm:!w-24 sm:!h-24 !rounded-2xl !border-2 ${positionColors.avatarBg} ${positionColors.border} ${
                            overallRating >= 8.0 ? "!shadow-[0_0_20px_rgba(74,222,128,0.3)]" : ""
                          }`}
                        />

                        {/* Rating Badge */}
                        {overallRating > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className={`absolute -bottom-2 -right-2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border-2 border-background shadow-lg ${getRatingColor(overallRating)}`}
                          >
                            <span className="text-sm sm:text-base font-bold">
                              {overallRating.toFixed(1)}
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {/* Name + Club */}
                      <div className="flex-1 min-w-0 pb-1">
                        <motion.h2
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate"
                        >
                          {player.name}
                        </motion.h2>
                        {player.currentClub && (
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5"
                          >
                            <MapPin className="w-3 h-3" />
                            {player.currentClub}
                          </motion.p>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-2 mt-2"
                        >
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${positionColors.bg} ${positionColors.text} ${positionColors.border}`}>
                            {player.position}
                          </span>
                          {player.shirtNumber > 0 && (
                            <Badge variant="outline" className="text-xs font-semibold">
                              #{player.shirtNumber}
                            </Badge>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* ===== PERSONAL INFO GRID ===== */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      {t('player.personalInfo')}
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {player.age > 0 && (
                        <InfoCard icon={Calendar} label={t('player.age')} value={String(player.age)} delay={0.05} />
                      )}
                      {player.birthDate && (
                        <InfoCard icon={CalendarDays} label={t('player.birthDate')} value={player.birthDate} delay={0.08} />
                      )}
                      {player.nationality && (
                        <InfoCard icon={Flag} label={t('player.nationality')} value={player.nationality} delay={0.11} />
                      )}
                      {player.height && (
                        <InfoCard icon={Ruler} label={t('player.height')} value={player.height} delay={0.14} />
                      )}
                      {player.weight && (
                        <InfoCard icon={Weight} label={t('player.weight')} value={player.weight} delay={0.17} />
                      )}
                    </div>
                  </div>

                  {/* ===== SEASON STATS WITH PROGRESS BARS ===== */}
                  {player.stats && (
                    <div className="px-5 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {t('player.seasonStats')}
                        </h3>
                        <span className="text-[10px] text-muted-foreground bg-surface-light px-2 py-0.5 rounded-full">
                          {player.stats.season}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <StatCard label={t('stats.matches')} value={player.stats.totalMatches} maxValue={40} delay={0.05} />
                        <StatCard label={t('stats.goals')} value={player.stats.goals} maxValue={30} icon={Target} delay={0.08} highlight={player.stats.goals > 10} />
                        <StatCard label={t('stats.assists')} value={player.stats.assists} maxValue={20} icon={TrendingUp} delay={0.11} highlight={player.stats.assists > 7} />
                        <StatCard label={t('stats.shots')} value={player.stats.shots} maxValue={120} delay={0.14} />
                        <StatCard label={t('stats.onTarget')} value={player.stats.shotsOnTarget} maxValue={70} delay={0.17} />
                        <StatCard label={t('stats.passAcc')} value={Math.round(player.stats.passingAccuracy)} maxValue={100} suffix="%" delay={0.20} />
                        <StatCard label={t('stats.tackles')} value={player.stats.tackles} maxValue={60} icon={Shield} delay={0.23} />
                        <StatCard label={t('stats.interceptions')} value={player.stats.interceptions} maxValue={40} delay={0.26} />
                        <StatCard label={t('stats.fouls')} value={player.stats.fouls} maxValue={40} delay={0.29} />
                      </div>

                      {/* Cards row */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t('stats.yellowCards')}</p>
                            <p className="text-lg font-bold text-yellow-400">{player.stats.yellowCards}</p>
                          </div>
                        </div>
                        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <div className="w-3 h-4 bg-red-400 rounded-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t('stats.redCards')}</p>
                            <p className="text-lg font-bold text-red-400">{player.stats.redCards}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== PERFORMANCE LINE CHART ===== */}
                  {player.stats?.matchRatings && player.stats.matchRatings.length > 0 && (
                    <div className="px-5 pb-4 space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {t('player.matchRatings')}
                      </h3>
                      <div className="glass-card rounded-xl p-4">
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={player.stats.matchRatings.map((mr) => ({
                                name: mr.match,
                                rating: mr.rating,
                                opponent: mr.opponent,
                              }))}
                            >
                              <defs>
                                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9, fill: "oklch(0.60 0.02 260)" }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-30}
                                textAnchor="end"
                                height={40}
                              />
                              <YAxis
                                domain={[5, 10]}
                                tick={{ fontSize: 9, fill: "oklch(0.60 0.02 260)" }}
                                axisLine={false}
                                tickLine={false}
                                width={28}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "oklch(0.12 0.01 260)",
                                  border: "1px solid oklch(1 0 0 / 8%)",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "oklch(0.95 0.01 260)",
                                }}
                                labelStyle={{ color: "oklch(0.60 0.02 260)", fontSize: "10px" }}
                                formatter={(value: number, _name: string, props: { payload: { opponent: string } }) => [
                                  `${value.toFixed(1)} vs ${props.payload.opponent}`,
                                  t('stats.rating'),
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="rating"
                                stroke="#22c55e"
                                strokeWidth={2.5}
                                fill="url(#ratingGradient)"
                                dot={{ r: 4, fill: "#22c55e", stroke: "#0a0a14", strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: "#22c55e", stroke: "#0a0a14", strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== TRANSFER HISTORY TIMELINE ===== */}
                  {player.transfers && player.transfers.length > 0 && (
                    <div className="px-5 pb-6 space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" />
                        {t('player.transferHistory')}
                      </h3>
                      <div className="relative pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-neon/30 via-neon/10 to-transparent" />

                        <div className="space-y-4">
                          {player.transfers.map((transfer, i) => (
                            <motion.div
                              key={transfer.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08, duration: 0.3 }}
                              className="relative"
                            >
                              {/* Timeline dot */}
                              <div className="absolute -left-6 top-3 w-3.5 h-3.5 rounded-full bg-surface-light border-2 border-neon/40 z-10 shadow-[0_0_6px_rgba(74,222,128,0.2)]" />

                              {/* Transfer card */}
                              <div className="glass-card rounded-xl p-3.5 hover:border-neon/20 transition-colors">
                                {/* Club movement */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate text-right">
                                      {transfer.fromClub}
                                    </p>
                                  </div>
                                  <div className="shrink-0 w-8 h-8 rounded-full bg-neon/10 flex items-center justify-center">
                                    <ArrowRight className="w-4 h-4 text-neon" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {transfer.toClub}
                                    </p>
                                  </div>
                                </div>

                                {/* Date & Fee */}
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                  <span className="text-[10px] text-muted-foreground">
                                    {transfer.date}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {transfer.fee && (
                                      <span
                                        className={`text-xs font-bold ${
                                          transfer.fee.toLowerCase() === "free"
                                            ? "text-green-400"
                                            : transfer.fee.toLowerCase() === "youth"
                                            ? "text-purple-400"
                                            : "text-neon"
                                        }`}
                                      >
                                        {transfer.fee}
                                      </span>
                                    )}
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getTransferTypeBadge(transfer.type)}`}>
                                      {transfer.type}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Info card component
function InfoCard({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-card rounded-xl p-3 flex items-center gap-2.5"
    >
      <div className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </motion.div>
  );
}
