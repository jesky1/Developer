'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClubLogo } from '@/components/ui/club-logo';
import { useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string; // "LIVE" | "HT" | "FT" | "UPCOMING"
    minute: number;
    league: string;
    isHot: boolean;
    homeLogo?: string;
    awayLogo?: string;
    kickoff?: string;
  };
  hasGoal?: boolean; // true when this match has an active goal flash
  onClick?: (match: any) => void;
  variant?: 'list' | 'card'; // list = compact row, card = full card with more detail
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status, minute, isHot, kickoff }: { status: string; minute: number; isHot: boolean; kickoff?: string }) {
  if (isHot && status === 'LIVE') {
    return (
      <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0 h-5 gap-0.5">
        <Flame className="w-2.5 h-2.5" />
        {minute}&apos;
      </Badge>
    );
  }
  if (status === 'LIVE') {
    return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 h-5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-pulse mr-1 inline-block" />
        {minute}&apos;
      </Badge>
    );
  }
  if (status === 'HT') {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0 h-5">
        HT
      </Badge>
    );
  }
  if (status === 'FT') {
    return (
      <Badge className="bg-surface-light text-muted-foreground border-border text-[10px] px-1.5 py-0 h-5">
        FT
      </Badge>
    );
  }
  // UPCOMING
  return (
    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0 h-5 gap-0.5">
      <Clock className="w-2.5 h-2.5" />
      {kickoff || 'Upcoming'}
    </Badge>
  );
}

// ─── TeamInitial removed — use ClubLogo component instead ────────────────────

// ─── Goal Flash Overlay ─────────────────────────────────────────────────────

function GoalFlashOverlay({ variant }: { variant: 'list' | 'card' }) {
  return (
    <motion.div
      initial={{ opacity: variant === 'card' ? 0.25 : 0.15 }}
      animate={{ opacity: 0 }}
      transition={{ duration: variant === 'card' ? 2 : 1.5, ease: 'easeOut' }}
      className="absolute inset-0 bg-neon pointer-events-none z-0"
      style={{ borderRadius: 'inherit' }}
    />
  );
}

// ─── Goal Badge ─────────────────────────────────────────────────────────────

function GoalBadge({ variant }: { variant: 'list' | 'card' }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.8 }}
      className={variant === 'card' ? 'absolute top-2 right-2 z-10' : 'relative z-10'}
    >
      <span
        className={`inline-flex items-center gap-0.5 font-black text-neon border border-neon/30 rounded-full goal-pulse-text ${
          variant === 'card'
            ? 'text-[10px] bg-neon/20 px-2 py-0.5'
            : 'text-[8px] bg-neon/15 px-1.5 py-px'
        }`}
        style={{
          textShadow:
            '0 0 8px color-mix(in oklch, var(--neon) 60%, transparent), 0 0 16px color-mix(in oklch, var(--neon) 30%, transparent)',
        }}
      >
        ⚽ GOAL!
      </span>
    </motion.div>
  );
}

// ─── Animated Score Number ──────────────────────────────────────────────────

function AnimatedScore({
  score,
  hasGoal,
  side,
}: {
  score: number;
  hasGoal: boolean;
  side: 'home' | 'away';
}) {
  return (
    <motion.span
      key={`score-${side}-${score}`}
      initial={
        hasGoal
          ? { scale: 1.4, color: 'oklch(0.72 0.22 155)' }
          : false
      }
      animate={{ scale: 1 }}
      transition={
        hasGoal
          ? { type: 'spring', stiffness: 300, damping: 15, mass: 0.6 }
          : { duration: 0 }
      }
      className={`font-bold tabular-nums inline-block ${
        hasGoal ? 'text-neon' : ''
      }`}
      style={
        hasGoal
          ? {
              textShadow:
                '0 0 10px color-mix(in oklch, var(--neon) 50%, transparent), 0 0 20px color-mix(in oklch, var(--neon) 25%, transparent)',
            }
          : undefined
      }
    >
      {score}
    </motion.span>
  );
}

// ─── Left Border Indicator (list variant) ───────────────────────────────────

function getLeftBorderStyle(status: string, isHot: boolean): string {
  if (isHot && status === 'LIVE') return 'border-l-2 border-l-orange-500';
  if (status === 'LIVE') return 'border-l-2 border-l-green-500';
  if (status === 'HT') return 'border-l-2 border-l-yellow-500';
  return 'border-l-2 border-l-transparent';
}

// ─── List Variant ───────────────────────────────────────────────────────────

function MatchCardList({ match, hasGoal, onClick }: MatchCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(match);
  }, [onClick, match]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(match);
      }
    },
    [onClick, match]
  );

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${match.homeTeam} ${match.homeScore}, ${match.awayTeam} ${match.awayScore}, ${match.status === 'LIVE' ? `${match.minute} minutes` : match.status}${hasGoal ? ', Goal scored!' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: hasGoal ? [1, 1.04, 1] : 1,
      }}
      transition={{
        scale: hasGoal
          ? { duration: 0.5, repeat: 1, ease: 'easeInOut' }
          : undefined,
        opacity: { duration: 0.3 },
        x: { duration: 0.3 },
      }}
      className={`relative grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-5 py-2.5 items-center hover:bg-white/[0.03] transition-colors cursor-pointer group h-12 ${getLeftBorderStyle(match.status, match.isHot)} ${
        hasGoal ? 'goal-flash-bg' : ''
      }`}
    >
      {/* Goal flash overlay */}
      <AnimatePresence>
        {hasGoal && <GoalFlashOverlay variant="list" />}
      </AnimatePresence>

      {/* Home Team */}
      <span
        className={`text-xs truncate relative z-[1] ${
          match.status === 'LIVE' ? 'font-semibold' : 'text-muted-foreground'
        }`}
      >
        {match.homeTeam}
        {match.isHot && match.status === 'LIVE' && (
          <span className="ml-1 text-[8px]">🔥</span>
        )}
      </span>

      {/* Score + GOAL badge */}
      <span className="w-16 text-center font-bold tabular-nums relative z-[1] flex flex-col items-center">
        <AnimatePresence>
          {hasGoal && <GoalBadge variant="list" />}
        </AnimatePresence>
        <span className="text-xs flex items-center gap-1">
          <AnimatedScore score={match.homeScore} hasGoal={!!hasGoal} side="home" />
          <span className="text-muted-foreground/50">-</span>
          <AnimatedScore score={match.awayScore} hasGoal={!!hasGoal} side="away" />
        </span>
      </span>

      {/* Away Team */}
      <span
        className={`text-xs truncate relative z-[1] ${
          match.status === 'LIVE' ? 'font-semibold' : 'text-muted-foreground'
        }`}
      >
        {match.awayTeam}
      </span>

      {/* Status + Chevron */}
      <div className="w-18 flex items-center justify-end gap-1 relative z-[1]">
        <StatusBadge
          status={match.status}
          minute={match.minute}
          isHot={match.isHot}
          kickoff={match.kickoff}
        />
        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

// ─── Card Variant ───────────────────────────────────────────────────────────

function MatchCardCard({ match, hasGoal, onClick }: MatchCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(match);
  }, [onClick, match]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(match);
      }
    },
    [onClick, match]
  );

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${match.homeTeam} ${match.homeScore}, ${match.awayTeam} ${match.awayScore}, ${match.league}, ${match.status === 'LIVE' ? `${match.minute} minutes` : match.status}${hasGoal ? ', Goal scored!' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 15 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: hasGoal ? [1, 1.05, 1] : 1,
      }}
      transition={{
        scale: hasGoal
          ? { duration: 0.6, repeat: 2, ease: 'easeInOut' }
          : undefined,
        opacity: { duration: 0.3 },
        y: { duration: 0.4 },
      }}
      whileHover={{ scale: hasGoal ? 1.05 : 1.03, y: -2 }}
      className={`glass-card glass-card-hover rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden ${
        match.isHot && match.status === 'LIVE' ? 'border-orange-500/40 neon-glow' : ''
      } ${hasGoal ? 'goal-flash-border' : ''}`}
    >
      {/* Goal flash background pulse */}
      <AnimatePresence>
        {hasGoal && <GoalFlashOverlay variant="card" />}
      </AnimatePresence>

      {/* Neon border glow when goal */}
      <AnimatePresence>
        {hasGoal && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              borderRadius: 'inherit',
              boxShadow:
                '0 0 20px color-mix(in oklch, var(--neon) 35%, transparent), 0 0 40px color-mix(in oklch, var(--neon) 15%, transparent), 0 0 60px color-mix(in oklch, var(--neon) 5%, transparent), inset 0 0 20px color-mix(in oklch, var(--neon) 8%, transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* GOAL! badge - top right */}
      <AnimatePresence>
        {hasGoal && <GoalBadge variant="card" />}
      </AnimatePresence>

      {/* League & Status */}
      <div className="flex items-center justify-between mb-3 relative z-[1]">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate pr-8">
          {match.league}
        </span>
        <StatusBadge
          status={match.status}
          minute={match.minute}
          isHot={match.isHot}
          kickoff={match.kickoff}
        />
      </div>

      {/* Teams + Scores */}
      <div className="space-y-2.5 relative z-[1]">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ClubLogo name={match.homeTeam} src={match.homeLogo} size="sm" />
            <span className="text-xs font-medium text-foreground truncate">
              {match.homeTeam}
            </span>
          </div>
          <AnimatedScore
            score={match.homeScore}
            hasGoal={!!hasGoal}
            side="home"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ClubLogo name={match.awayTeam} src={match.awayLogo} size="sm" />
            <span className="text-xs font-medium text-foreground truncate">
              {match.awayTeam}
            </span>
          </div>
          <AnimatedScore
            score={match.awayScore}
            hasGoal={!!hasGoal}
            side="away"
          />
        </div>
      </div>

      {/* Hot match indicator bar */}
      {match.isHot && match.status === 'LIVE' && (
        <div className="mt-3 pt-2 border-t border-orange-500/20 relative z-[1]">
          <div className="flex items-center gap-1 text-[9px] text-orange-400 font-semibold uppercase tracking-wider">
            <Flame className="w-2.5 h-2.5" />
            Hot Match
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function MatchCard(props: MatchCardProps) {
  const variant = props.variant ?? 'list';

  if (variant === 'card') {
    return <MatchCardCard {...props} />;
  }

  return <MatchCardList {...props} />;
}

export type { MatchCardProps };
