"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";

interface FanPollsProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
  } | null;
  poll: {
    homeVotes: number;
    drawVotes: number;
    awayVotes: number;
  } | null;
}

export function FanPolls({ match, poll }: FanPollsProps) {
  const [voted, setVoted] = useState<string | null>(null);
  const [localPoll, setLocalPoll] = useState(poll);

  if (!match || !localPoll) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-surface-light rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-8 bg-surface-light rounded" />
          <div className="h-8 bg-surface-light rounded" />
          <div className="h-8 bg-surface-light rounded" />
        </div>
      </div>
    );
  }

  const total = localPoll.homeVotes + localPoll.drawVotes + localPoll.awayVotes;
  const homePct = total > 0 ? Math.round((localPoll.homeVotes / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((localPoll.drawVotes / total) * 100) : 0;
  const awayPct = total > 0 ? Math.round((localPoll.awayVotes / total) * 100) : 0;

  const handleVote = async (vote: "home" | "draw" | "away") => {
    if (voted) return;
    setVoted(vote);
    setLocalPoll((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${vote}Votes`]: prev[`${vote}Votes` as keyof typeof prev] + 1,
      };
    });

    try {
      await fetch("/api/polls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, vote }),
      });
    } catch {
      // Silent fail for voting
    }
  };

  const options = [
    { key: "home" as const, label: match.homeTeam, pct: homePct, color: "bg-neon" },
    { key: "draw" as const, label: "Draw", pct: drawPct, color: "bg-yellow-500" },
    { key: "away" as const, label: match.awayTeam, pct: awayPct, color: "bg-purple-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <ThumbsUp className="w-4 h-4 text-neon" />
        <h3 className="text-sm font-semibold text-foreground">Fan Poll</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Who will win?</p>

      <div className="space-y-3">
        {options.map((option) => (
          <motion.button
            key={option.key}
            onClick={() => handleVote(option.key)}
            disabled={!!voted}
            className={`w-full relative overflow-hidden rounded-lg border transition-all ${
              voted === option.key
                ? "border-neon/50 neon-glow"
                : voted
                ? "border-white/5 opacity-60"
                : "border-white/10 hover:border-neon/30 cursor-pointer"
            }`}
            whileHover={!voted ? { scale: 1.02 } : {}}
            whileTap={!voted ? { scale: 0.98 } : {}}
          >
            {/* Background progress bar */}
            <motion.div
              className={`absolute inset-y-0 left-0 ${option.color} opacity-15`}
              initial={{ width: 0 }}
              animate={{ width: `${option.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            <div className="relative flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-medium text-foreground">{option.label}</span>
              <span className="text-xs font-bold text-neon tabular-nums">{option.pct}%</span>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[10px] text-muted-foreground">
          {total.toLocaleString()} votes
        </span>
      </div>
    </motion.div>
  );
}
