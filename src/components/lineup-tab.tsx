"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ClubLogo } from "@/components/ui/club-logo";
import { useTranslation } from "@/lib/i18n";

/* ================================================================== */
/*  INTERFACES                                                        */
/* ================================================================== */

interface LineupTabProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  onPlayerClick: (playerName: string) => void;
}

interface PlayerLineup {
  name: string;
  number: number;
  position: string;
  rating: number;
  photo?: string;
}

interface Substitute {
  name: string;
  number: number;
  position: string;
  photo?: string;
}

interface LineupData {
  team: "home" | "away";
  teamName: string;
  formation: string;
  startXI: PlayerLineup[];
  substitutes: Substitute[];
  coach: string;
}

interface Position {
  x: number;
  y: number;
}

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Get player's last name for display */
function getLastName(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

/** Get player's initials for headshot placeholder */
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Rating color for LiveScore-style badges */
function getRatingColor(rating: number): string {
  if (rating >= 8.0) return "bg-green-500 text-white";
  if (rating >= 7.0) return "bg-lime-500/90 text-black";
  if (rating >= 6.5) return "bg-yellow-500/90 text-black";
  if (rating >= 6.0) return "bg-orange-500/90 text-white";
  return "bg-red-500/90 text-white";
}

/* ================================================================== */
/*  POSITION CALCULATION — HORIZONTAL LAYOUT                           */
/*  Home = LEFT half  |  Away = RIGHT half                             */
/*  Optimized for proportional spacing without overlap                  */
/* ================================================================== */

function getHorizontalPositions(formation: string, isAway: boolean): Position[] {
  const lines = formation.split("-").map(Number);
  const positions: Position[] = [];

  // X columns: GK furthest from center, forwards closest to center
  // Adjusted for better spacing and proportion
  const xColumnsHome = [5, 17, 30, 41, 47];
  const xColumnsAway = [95, 83, 70, 59, 53];

  // GK
  const gkX = isAway ? xColumnsAway[0] : xColumnsHome[0];
  positions.push({ x: gkX, y: 50 });

  // Each formation line
  lines.forEach((count, lineIdx) => {
    const x = isAway
      ? (xColumnsAway[lineIdx + 1] ?? 60)
      : (xColumnsHome[lineIdx + 1] ?? 40);

    for (let i = 0; i < count; i++) {
      // Distribute Y evenly with generous padding to avoid name overlap
      // More players = tighter but still with minimum gap
      const padding = count >= 4 ? 10 : count >= 3 ? 13 : 16;
      const usableRange = 100 - 2 * padding;
      const y = padding + ((i + 1) / (count + 1)) * usableRange;
      positions.push({ x, y });
    }
  });

  return positions;
}

/* ================================================================== */
/*  HORIZONTAL PITCH SVG — LiveScore minimalistic style                */
/*  ViewBox 1050 x 680 (real pitch proportions rotated)               */
/* ================================================================== */

function HorizontalPitchSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1050 680"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        fill="none"
      >
        {/* Pitch outline */}
        <rect x="30" y="30" width="990" height="620" />

        {/* Halfway line (vertical) */}
        <line x1="525" y1="30" x2="525" y2="650" />

        {/* Center circle */}
        <circle cx="525" cy="340" r="91.5" />

        {/* Center spot */}
        <circle cx="525" cy="340" r="4" fill="rgba(255,255,255,0.18)" stroke="none" />

        {/* ===== LEFT HALF (Home) ===== */}
        <rect x="30" y="140" width="165" height="400" />
        <rect x="30" y="235" width="55" height="210" />
        <circle cx="140" cy="340" r="4" fill="rgba(255,255,255,0.18)" stroke="none" />
        <path d="M 195 250 A 91.5 91.5 0 0 1 195 430" />
        <rect x="8" y="265" width="22" height="150" strokeDasharray="5 3" />
        <path d="M 40 30 A 10 10 0 0 1 30 40" />
        <path d="M 30 640 A 10 10 0 0 1 40 650" />

        {/* ===== RIGHT HALF (Away) ===== */}
        <rect x="855" y="140" width="165" height="400" />
        <rect x="965" y="235" width="55" height="210" />
        <circle cx="910" cy="340" r="4" fill="rgba(255,255,255,0.18)" stroke="none" />
        <path d="M 855 250 A 91.5 91.5 0 0 0 855 430" />
        <rect x="1020" y="265" width="22" height="150" strokeDasharray="5 3" />
        <path d="M 1010 30 A 10 10 0 0 0 1020 40" />
        <path d="M 1020 640 A 10 10 0 0 0 1010 650" />
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  SILHOUETTE SVG — Professional player silhouette fallback            */
/* ================================================================== */

function PlayerSilhouette({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <circle cx="20" cy="12" r="6" fill="currentColor" opacity="0.5" />
      {/* Body */}
      <path
        d="M20 18 C14 18 10 22 10 28 L10 34 C10 35 11 36 12 36 L28 36 C29 36 30 35 30 34 L30 28 C30 22 26 18 20 18Z"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

/* ================================================================== */
/*  PLAYER HEADSHOT — with silhouette fallback                          */
/* ================================================================== */

function PlayerHeadshot({
  name,
  photo,
  isHighRating,
}: {
  name: string;
  photo?: string;
  isHighRating: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const handleError = useCallback(() => setImgError(true), []);
  const hasValidPhoto = photo && photo.length > 5 && !imgError;

  return (
    <div
      className={`
        w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
        text-xs sm:text-sm font-bold transition-all duration-200
        bg-[#1e293b] border border-white/15
        group-hover:border-white/40 group-hover:shadow-lg group-hover:shadow-white/5
        overflow-hidden relative
        ${isHighRating ? "ring-1.5 ring-green-400/60" : ""}
      `}
      style={isHighRating ? { boxShadow: "0 0 8px rgba(74,222,128,0.25)" } : undefined}
    >
      {hasValidPhoto ? (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <>
          {/* Silhouette background */}
          <PlayerSilhouette className="absolute inset-0 w-full h-full text-white/20" />
          {/* Initials on top */}
          <span className="relative z-10 text-white/80 font-semibold text-[10px] sm:text-xs">
            {getInitials(name)}
          </span>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PLAYER CARD — LiveScore style: headshot + pill badge               */
/*  Improved to prevent name overlap                                   */
/* ================================================================== */

function LiveScorePlayerCard({
  player,
  position,
  onPlayerClick,
  index,
  teamSide,
}: {
  player: PlayerLineup;
  position: Position;
  onPlayerClick: (name: string) => void;
  index: number;
  teamSide: "home" | "away";
}) {
  const isHighRating = player.rating >= 7.5;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: index * 0.035,
        type: "spring",
        stiffness: 220,
        damping: 18,
      }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onPlayerClick(player.name)}
      className="absolute flex flex-col items-center group cursor-pointer z-10"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={`${player.name}, number ${player.number}, position ${player.position}`}
    >
      {/* Headshot circle with fallback */}
      <div className="relative">
        <PlayerHeadshot
          name={player.name}
          photo={player.photo}
          isHighRating={isHighRating}
        />

        {/* Rating badge — top right of headshot */}
        {player.rating > 0 && (
          <span
            className={`
              absolute -top-1 -right-2 sm:-right-2.5
              text-[7px] sm:text-[9px] font-bold
              w-4.5 h-4.5 sm:w-5 sm:h-5
              flex items-center justify-center
              rounded-sm leading-none
              ${getRatingColor(player.rating)}
            `}
            style={{ minWidth: "16px", minHeight: "16px" }}
          >
            {formatRating(player.rating)}
          </span>
        )}
      </div>

      {/* Pill-shaped name badge — max width constrained to prevent overlap */}
      <div
        className="
          mt-0.5 px-1.5 py-[1px] sm:px-2 sm:py-[2px]
          bg-black/80 rounded-full
          flex items-center gap-0.5
          backdrop-blur-sm
          border border-white/8
          group-hover:bg-black/90 group-hover:border-white/20
          transition-all duration-200
          max-w-[60px] sm:max-w-[72px]
        "
      >
        <span className="text-[7px] sm:text-[9px] font-bold text-white/60 tabular-nums leading-none shrink-0">
          {player.number}
        </span>
        <span className="text-[7px] sm:text-[9px] font-semibold text-white/90 leading-none truncate">
          {getLastName(player.name)}
        </span>
      </div>
    </motion.button>
  );
}

/* ================================================================== */
/*  SKELETON LOADER                                                    */
/* ================================================================== */

function LineupSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="w-full rounded-xl" style={{ aspectRatio: "3 / 2" }} />
    </div>
  );
}

/* ================================================================== */
/*  BENCH SECTION — Substitutes                                        */
/* ================================================================== */

function BenchSection({
  substitutes,
  teamName,
  teamSide,
  onPlayerClick,
}: {
  substitutes: Substitute[];
  teamName: string;
  teamSide: "home" | "away";
  onPlayerClick: (name: string) => void;
}) {
  const { t } = useTranslation();
  const accentDot = teamSide === "home"
    ? "bg-emerald-500/60"
    : "bg-sky-500/60";
  const accentText = teamSide === "home"
    ? "text-emerald-400/70"
    : "text-sky-400/70";

  return (
    <div className="px-3 sm:px-4 py-3 border-t border-white/5 bg-[#0c1220]">
      <div className="flex items-center gap-2 mb-2">
        <Users className={`w-3 h-3 ${accentText}`} />
        <h4 className="text-[9px] sm:text-[10px] font-semibold text-white/40 uppercase tracking-wider">
          {teamName} {t("matchDetail.substitutes")}
        </h4>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {substitutes.map((sub, i) => {
          return (
            <motion.button
              key={`bench-${sub.number}-${i}`}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPlayerClick(sub.name)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer border border-white/5"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#1e293b] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {sub.photo && sub.photo.length > 5 ? (
                  <img src={sub.photo} alt={sub.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <PlayerSilhouette className="w-4 h-4 sm:w-5 sm:h-5 text-white/25" />
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] sm:text-[10px] font-medium text-white/80 max-w-[56px] sm:max-w-[72px] truncate">
                  {getLastName(sub.name)}
                </span>
                <span className="text-[7px] sm:text-[8px] font-semibold text-white/30 uppercase">
                  {sub.number} · {sub.position}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  STARTING XI LIST — Below pitch detail                              */
/* ================================================================== */

function StartingXIList({
  lineup,
  teamSide,
  onPlayerClick,
}: {
  lineup: LineupData;
  teamSide: "home" | "away";
  onPlayerClick: (name: string) => void;
}) {
  const { t } = useTranslation();
  const bestPlayer = lineup.startXI.reduce(
    (best, p) => (p.rating > best.rating ? p : best),
    lineup.startXI[0]
  );
  const accentText = teamSide === "home" ? "text-emerald-400" : "text-sky-400";
  const accentBg = teamSide === "home" ? "bg-emerald-500/8" : "bg-sky-500/8";

  return (
    <div className="px-3 sm:px-4 py-2 bg-[#0c1220]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${teamSide === "home" ? "bg-emerald-500/50" : "bg-sky-500/50"}`} />
          <span className="text-[9px] sm:text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {lineup.teamName} {t("matchDetail.startingXI")}
          </span>
        </div>
        {bestPlayer && bestPlayer.rating >= 7.5 && (
          <span className={`text-[9px] ${accentText} font-semibold`}>
            ⭐ {getLastName(bestPlayer.name)} {bestPlayer.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="space-y-0">
        {lineup.startXI.map((player, i) => {
          const isBest = bestPlayer && player.name === bestPlayer.name && bestPlayer.rating >= 8.0;
          return (
            <motion.button
              key={`xi-${player.number}-${i}`}
              type="button"
              initial={{ opacity: 0, x: teamSide === "home" ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025 }}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPlayerClick(player.name)}
              className={`flex items-center gap-2 py-1 px-1.5 rounded-md transition-colors cursor-pointer w-full text-left ${isBest ? accentBg : ""}`}
            >
              <span className="text-[10px] sm:text-xs font-mono font-bold text-white/30 w-5 sm:w-6 text-center shrink-0">
                {player.number}
              </span>
              {/* Small player photo */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1e293b] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {player.photo && player.photo.length > 5 ? (
                  <img src={player.photo} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <PlayerSilhouette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/25" />
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium truncate flex-1 ${isBest ? accentText : "text-white/80"}`}>
                {player.name}
              </span>
              <Badge
                variant="outline"
                className="text-[8px] sm:text-[9px] px-1 py-0 bg-transparent border-white/10 text-white/40"
              >
                {player.position}
              </Badge>
              {player.rating > 0 && (
                <span className={`text-[9px] sm:text-[10px] font-bold tabular-nums min-w-[24px] text-right ${player.rating >= 8 ? "text-green-400" : player.rating >= 7 ? "text-lime-400" : player.rating >= 6 ? "text-yellow-400" : "text-red-400"
                  }`}>
                  {formatRating(player.rating)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function LineupTab({ matchId, homeTeam, awayTeam, onPlayerClick }: LineupTabProps) {
  const { t } = useTranslation();
  const [lineups, setLineups] = useState<LineupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLineup() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/lineup?fixtureId=${matchId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setLineups([]);
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch lineup data");
        }
        const data = await res.json();
        if (!cancelled) {
          setLineups(Array.isArray(data) ? data : []);
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

    fetchLineup();
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading) return <LineupSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center bg-[#0c1220] border border-white/5">
        <p className="text-red-400 text-sm font-medium">{t("lineup.failedToLoad")}</p>
        <p className="text-white/30 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (lineups.length === 0) {
    return (
      <div className="rounded-xl p-8 sm:p-12 text-center bg-[#0c1220] border border-white/5">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
        </div>
        <p className="text-white/40 text-sm font-medium">{t("lineup.noData")}</p>
        <p className="text-white/20 text-xs mt-1">{t("lineup.WillAppearWhenAnnounced")}</p>
      </div>
    );
  }

  const homeLineup = lineups.find((l) => l.team === "home");
  const awayLineup = lineups.find((l) => l.team === "away");

  const homePositions = homeLineup ? getHorizontalPositions(homeLineup.formation, false) : [];
  const awayPositions = awayLineup ? getHorizontalPositions(awayLineup.formation, true) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ===== FORMATION HEADER BAR ===== */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0a0f1e] border-b border-white/5">
        {/* Home formation */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">
            {homeTeam}
          </span>
          {homeLineup && (
            <span className="text-[11px] sm:text-sm font-bold text-white/90 font-mono tracking-wide">
              {homeLineup.formation}
            </span>
          )}
        </div>

        {/* FORMASI center label */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] sm:text-[9px] font-bold text-white/25 uppercase tracking-[0.2em]">
            {t("matchDetail.formation")}
          </span>
        </div>

        {/* Away formation */}
        <div className="flex items-center gap-2">
          {awayLineup && (
            <span className="text-[11px] sm:text-sm font-bold text-white/90 font-mono tracking-wide">
              {awayLineup.formation}
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">
            {awayTeam}
          </span>
          <div className="w-2 h-2 rounded-full bg-sky-500/70" />
        </div>
      </div>

      {/* ===== HORIZONTAL PITCH — LiveScore Style ===== */}
      <div
        className="relative w-full overflow-hidden bg-[#0f1729]"
        style={{ aspectRatio: "3 / 2" }}
      >
        {/* Subtle dark gradient overlays for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 50% 50%, rgba(15,23,41,0) 0%, rgba(10,15,30,0.4) 100%),
              linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.2) 100%)
            `,
          }}
        />

        {/* Pitch lines */}
        <HorizontalPitchSVG />

        {/* Home players (left half) */}
        {homeLineup &&
          homeLineup.startXI.map((player, index) => (
            <LiveScorePlayerCard
              key={`home-${player.number}-${index}`}
              player={player}
              position={homePositions[index] || { x: 25, y: 50 }}
              onPlayerClick={onPlayerClick}
              index={index}
              teamSide="home"
            />
          ))}

        {/* Away players (right half) */}
        {awayLineup &&
          awayLineup.startXI.map((player, index) => (
            <LiveScorePlayerCard
              key={`away-${player.number}-${index}`}
              player={player}
              position={awayPositions[index] || { x: 75, y: 50 }}
              onPlayerClick={onPlayerClick}
              index={index + (homeLineup?.startXI.length || 0)}
              teamSide="away"
            />
          ))}
      </div>

      {/* ===== COACH BAR ===== */}
      {(homeLineup?.coach || awayLineup?.coach) && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#0a0f1e] border-t border-white/5">
          {homeLineup?.coach ? (
            <span className="text-[9px] sm:text-[10px] text-white/30">
              <span className="text-white/15 uppercase tracking-wider">{t("matchDetail.coach")}: </span>
              <span className="text-emerald-400/60 font-medium">{homeLineup.coach}</span>
            </span>
          ) : <span />}
          {awayLineup?.coach ? (
            <span className="text-[9px] sm:text-[10px] text-white/30">
              <span className="text-white/15 uppercase tracking-wider">{t("matchDetail.coach")}: </span>
              <span className="text-sky-400/60 font-medium">{awayLineup.coach}</span>
            </span>
          ) : <span />}
        </div>
      )}

      {/* ===== BELOW THE PITCH: Team details ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 mt-px">
        {/* Home team */}
        {homeLineup && (
          <div className="bg-[#0c1220]">
            <StartingXIList lineup={homeLineup} teamSide="home" onPlayerClick={onPlayerClick} />
            {homeLineup.substitutes.length > 0 && (
              <BenchSection
                substitutes={homeLineup.substitutes}
                teamName={homeTeam}
                teamSide="home"
                onPlayerClick={onPlayerClick}
              />
            )}
          </div>
        )}

        {/* Away team */}
        {awayLineup && (
          <div className="bg-[#0c1220]">
            <StartingXIList lineup={awayLineup} teamSide="away" onPlayerClick={onPlayerClick} />
            {awayLineup.substitutes.length > 0 && (
              <BenchSection
                substitutes={awayLineup.substitutes}
                teamName={awayTeam}
                teamSide="away"
                onPlayerClick={onPlayerClick}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
