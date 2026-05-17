"use client";

import { motion } from "framer-motion";
import { MatchCard } from "@/components/match-card";
import type { MatchCardProps } from "@/components/match-card";

interface FeaturedMatchesGridProps {
  matches: MatchCardProps['match'][];
  onMatchClick?: (match: MatchCardProps['match']) => void;
  goalMatchIds?: Set<string>;
  isLoading?: boolean;
}

export function FeaturedMatchesGrid({ matches, onMatchClick, goalMatchIds, isLoading }: FeaturedMatchesGridProps) {
  // Loading skeleton
  if (isLoading || matches.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-surface-light rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-light rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="scores">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-bold text-foreground mb-4"
      >
        More Matches
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {matches.map((match) => {
          const hasGoal = goalMatchIds?.has(match.id);

          return (
            <MatchCard
              key={match.id}
              match={match}
              hasGoal={hasGoal}
              onClick={onMatchClick}
              variant="card"
            />
          );
        })}
      </div>
    </div>
  );
}
