"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface HotMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  minute: number;
  isHot: boolean;
}

interface HotMatchHighlightProps {
  matches: HotMatch[];
}

/**
 * A floating banner that auto-highlights the hottest live match.
 *
 * - Appears at bottom-left with a pulsing red/orange glow
 * - Slides up from bottom via framer-motion
 * - Auto-dismisses after 15 seconds (can be manually closed)
 * - Only shows on first load or when a NEW hot match appears
 * - Clicking scrolls to the #live section
 */
export function HotMatchHighlight({ matches }: HotMatchHighlightProps) {
  const { t } = useTranslation();
  // Derive the hottest live match from props
  const hottestMatch = useMemo<HotMatch | null>(
    () => matches.find((m) => m.isHot === true && m.status === "LIVE") ?? null,
    [matches]
  );

  const hottestMatchId = hottestMatch?.id ?? null;

  // Track which hot match IDs have been dismissed (persisted across renders)
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  // The ID of the last dismissed match (used to derive visibility without setState in effects)
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  // Timer ref for auto-dismiss
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visibility is purely derived: hot match exists and hasn't been dismissed
  const isVisible = hottestMatchId !== null && hottestMatchId !== dismissedId;

  // Set up auto-dismiss timer when a new hot match becomes visible
  useEffect(() => {
    if (!isVisible || !hottestMatchId) return;

    // Clear any existing timer
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }

    // Auto-dismiss after 15 seconds — this setState is called from a
    // timer callback (asynchronous), which is allowed in effects.
    autoDismissTimerRef.current = setTimeout(() => {
      dismissedIdsRef.current.add(hottestMatchId);
      setDismissedId(hottestMatchId);
    }, 15000);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [isVisible, hottestMatchId]);

  const handleClose = () => {
    if (hottestMatchId) {
      dismissedIdsRef.current.add(hottestMatchId);
      setDismissedId(hottestMatchId);
    }
  };

  const handleClick = () => {
    const liveSection = document.getElementById("live");
    if (liveSection) {
      liveSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && hottestMatch && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 24,
          }}
          className="fixed bottom-6 left-6 z-50 cursor-pointer select-none"
          onClick={handleClick}
        >
          <div className="hot-match-banner">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="hot-match-close"
              aria-label={t("hotMatch.dismiss")}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Pulsing glow ring (decorative) */}
            <div className="hot-match-glow-ring" />

            {/* Content */}
            <div className="flex items-center gap-3">
              <span className="text-xl leading-none">🔥</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                  {t("match.hotMatch")}
                </span>
                <span className="text-sm font-bold text-white leading-tight">
                  {hottestMatch.homeTeam}{" "}
                  <span className="text-orange-300">
                    {hottestMatch.homeScore}–{hottestMatch.awayScore}
                  </span>{" "}
                  {hottestMatch.awayTeam}
                </span>
                <span className="text-[10px] text-orange-400/70">
                  {hottestMatch.minute}&apos;
                </span>
              </div>
            </div>

            {/* Click hint */}
            <span className="text-[9px] text-orange-400/50 mt-1.5 block">
              {t("hotMatch.clickToJump")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
