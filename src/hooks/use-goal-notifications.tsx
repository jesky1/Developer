"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface MatchEvent {
  type: string;
  team: string;
  player: string;
  minute: number;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  minute: number;
  events: MatchEvent[];
}

// Request browser notification permission on mount
let notificationPermissionRequested = false;

async function requestNotificationPermission() {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (notificationPermissionRequested) return;
  notificationPermissionRequested = true;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Silent fail - permission denied or not supported
    }
  }
}

// Trigger vibration pattern for a goal
function vibrateOnGoal() {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;

  try {
    // Pattern: buzz, pause, buzz, pause, long buzz
    navigator.vibrate([100, 50, 100, 50, 200]);
  } catch {
    // Silent fail
  }
}

// Send browser push notification
function sendPushNotification(data: {
  team: string;
  player: string;
  minute: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Don't send push notification if the tab is focused (toast is enough)
  if (document.visibilityState === "visible") return;

  try {
    const notification = new Notification("⚽ GOAL!", {
      body: `${data.player} ${data.minute}' — ${data.team}\n${data.homeTeam} ${data.homeScore} – ${data.awayScore} ${data.awayTeam}`,
      icon: "/goalzone-logo.png",
      badge: "/goalzone-logo.png",
      tag: `goal-${data.homeTeam}-${data.awayScore}-${data.minute}`,
      requireInteraction: false,
      silent: false,
    });

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);

    // Click to focus the tab
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Silent fail
  }
}

/**
 * Tracks goal changes across data refreshes and fires:
 * 1. Sonner toast notifications (in-app, when tab is visible)
 * 2. Browser push notifications (when tab is in background)
 * 3. Vibration feedback (on mobile devices)
 *
 * - Ignores initial load (no spurious toasts on mount)
 * - Only triggers for LIVE matches
 * - Deduplicates by tracking notified goal keys
 */
export function useGoalNotifications(matches: Match[]) {
  // Store the previous matches state so we can diff scores
  const prevMatchesRef = useRef<Match[]>([]);
  // Track which goal combinations we've already notified about
  const notifiedGoalsRef = useRef<Set<string>>(new Set());
  // Flag to skip the first data load
  const isFirstLoadRef = useRef(true);

  // Request notification permission on first use
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleGoalDetected = useCallback((data: {
    team: string;
    player: string;
    minute: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  }) => {
    // 1. In-app toast notification
    showGoalToast(data);

    // 2. Vibrate the device
    vibrateOnGoal();

    // 3. Push notification (only when tab is in background)
    sendPushNotification(data);
  }, []);

  useEffect(() => {
    const prevMatches = prevMatchesRef.current;

    // On first load, seed the notified set
    if (isFirstLoadRef.current) {
      for (const match of matches) {
        const key = `${match.id}:${match.homeScore}:${match.awayScore}`;
        notifiedGoalsRef.current.add(key);
      }
      isFirstLoadRef.current = false;
      prevMatchesRef.current = matches;
      return;
    }

    // Build a lookup map for previous matches by ID
    const prevMap = new Map<string, Match>();
    for (const pm of prevMatches) {
      prevMap.set(pm.id, pm);
    }

    for (const match of matches) {
      // Only process LIVE matches
      if (match.status !== "LIVE" && match.status !== "HT") continue;

      const prevMatch = prevMap.get(match.id);
      if (!prevMatch) continue;

      const homeScored = match.homeScore - prevMatch.homeScore;
      const awayScored = match.awayScore - prevMatch.awayScore;

      // Home team scored
      if (homeScored > 0) {
        const goalKey = `${match.id}:${match.homeScore}:${match.awayScore}:home`;
        if (!notifiedGoalsRef.current.has(goalKey)) {
          notifiedGoalsRef.current.add(goalKey);

          const goalEvent = [...match.events]
            .reverse()
            .find(
              (e) =>
                e.type === "goal" &&
                e.team === match.homeTeam &&
                e.minute <= match.minute
            );

          handleGoalDetected({
            team: match.homeTeam,
            player: goalEvent?.player || "Unknown",
            minute: goalEvent?.minute || match.minute,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          });
        }
      }

      // Away team scored
      if (awayScored > 0) {
        const goalKey = `${match.id}:${match.homeScore}:${match.awayScore}:away`;
        if (!notifiedGoalsRef.current.has(goalKey)) {
          notifiedGoalsRef.current.add(goalKey);

          const goalEvent = [...match.events]
            .reverse()
            .find(
              (e) =>
                e.type === "goal" &&
                e.team === match.awayTeam &&
                e.minute <= match.minute
            );

          handleGoalDetected({
            team: match.awayTeam,
            player: goalEvent?.player || "Unknown",
            minute: goalEvent?.minute || match.minute,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          });
        }
      }
    }

    // Update the ref for the next comparison
    prevMatchesRef.current = matches;
  }, [matches, handleGoalDetected]);
}

interface GoalToastData {
  team: string;
  player: string;
  minute: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

function showGoalToast(data: GoalToastData) {
  toast.custom(
    () => (
      <div className="goal-toast">
        <div className="goal-toast-header">
          <span className="goal-toast-emoji">⚽</span>
          <span className="goal-toast-title">GOAL!</span>
          <span className="goal-toast-vibrate-icon">📳</span>
        </div>
        <div className="goal-toast-body">
          <div className="goal-toast-team">{data.team}</div>
          <div className="goal-toast-player">{data.player} {data.minute}&apos;</div>
        </div>
        <div className="goal-toast-score">
          {data.homeTeam} {data.homeScore} – {data.awayScore} {data.awayTeam}
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: "top-right",
    }
  );
}
