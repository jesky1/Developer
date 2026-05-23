"use client";

import { motion } from "framer-motion";
import { MatchCard } from "@/components/match-card";
import type { MatchCardProps } from "@/components/match-card";
import { useTranslation } from "@/lib/i18n";

interface LiveMatchesListProps {
  matches: MatchCardProps['match'][];
  onMatchClick?: (match: MatchCardProps['match']) => void;
  goalMatchIds?: Set<string>;
  isLoading?: boolean;
}

export function LiveMatchesList({ matches, onMatchClick, goalMatchIds, isLoading }: LiveMatchesListProps) {
  const { t } = useTranslation();

  // Loading skeleton
  if (isLoading || matches.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('match.liveAndRecent')}</h3>
            {isLoading && (
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-neon live-pulse" />
                {t('status.connecting')}
              </span>
            )}
          </div>
        </div>

        {/* Skeleton rows */}
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-5 py-2.5 items-center h-12"
            >
              <div className="h-3 bg-surface-light rounded w-20 animate-pulse" />
              <div className="h-3 bg-surface-light rounded w-10 animate-pulse" />
              <div className="h-3 bg-surface-light rounded w-20 animate-pulse" />
              <div className="h-3 bg-surface-light rounded w-10 animate-pulse" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Count live matches
  const liveCount = matches.filter(m => m.status === 'LIVE').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t('match.liveAndRecent')}</h3>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-pulse" />
              {liveCount} {t('status.live')}
            </span>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-5 pb-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        <span>{t('match.home')}</span>
        <span className="w-16 text-center">{t('match.score')}</span>
        <span>{t('match.away')}</span>
        <span className="w-18" />
      </div>

      {/* Match Cards */}
      <div className="max-h-96 overflow-y-auto">
        {matches.map((match, i) => {
          const hasGoal = goalMatchIds?.has(match.id);

          return (
            <MatchCard
              key={match.id}
              match={match}
              hasGoal={hasGoal}
              onClick={onMatchClick}
              variant="list"
            />
          );
        })}
      </div>
    </motion.div>
  );
}
