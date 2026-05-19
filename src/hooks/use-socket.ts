'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, destroySocket, isWebSocketDisabled } from '@/services/socket';
import type {
  Match,
  Scorer,
  Standing,
  GoalEvent,
  InitialDataPayload,
  LiveMatchesUpdatePayload,
} from '@/services/socket';

// Re-export types from socket service
export type { Match, Scorer, Standing, GoalEvent, MatchEvent } from '@/services/socket';

// --- Hook return type ---

interface UseSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  isLoading: boolean;
  matches: Match[];
  scorers: Scorer[];
  standings: Standing[];
  goalEvents: GoalEvent[];
  requestUpdate: () => void;
  lastUpdate: Date | null;
  connectedClients: number;
  dataSource: 'ws' | 'rest' | null;
  wsReconnectAttempts: number;
}

// --- REST API fallback data fetcher ---

async function fetchMatchesFromAPI(): Promise<Match[]> {
  try {
    const res = await fetch('/api/matches');
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((m: Record<string, unknown>) => ({
      id: m.id as string,
      homeTeam: (m.homeTeam as string) || '',
      awayTeam: (m.awayTeam as string) || '',
      homeScore: (m.homeScore as number) || 0,
      awayScore: (m.awayScore as number) || 0,
      status: (m.status as string) || 'UPCOMING',
      minute: (m.minute as number) || 0,
      league: (m.league as string) || '',
      leagueLogo: (m.leagueLogo as string) || undefined,
      homeLogo: (m.homeLogo as string) || undefined,
      awayLogo: (m.awayLogo as string) || undefined,
      stadium: (m.stadium as string) || '',
      kickoff: (m.kickoff as string) || '',
      events: parseJSON<MatchEvent[]>(m.events as string, []),
      isHot: (m.isHot as boolean) || false,
      poll: m.poll ? {
        homeVotes: (m.poll as Record<string, number>).homeVotes || 0,
        drawVotes: (m.poll as Record<string, number>).drawVotes || 0,
        awayVotes: (m.poll as Record<string, number>).awayVotes || 0,
      } : undefined,
      homeForm: parseJSON<string[]>(m.homeForm as string, []),
      awayForm: parseJSON<string[]>(m.awayForm as string, []),
    }));
  } catch (err) {
    console.error('Failed to fetch matches from API:', err);
    return [];
  }
}

async function fetchScorersFromAPI(): Promise<Scorer[]> {
  try {
    const res = await fetch('/api/scorers');
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((s: Record<string, unknown>) => ({
      id: (s.id as string) || undefined,
      name: (s.name as string) || '',
      team: (s.team as string) || '',
      teamLogo: (s.teamLogo as string) || undefined,
      goals: (s.goals as number) || 0,
      assists: (s.assists as number) || 0,
      matches: (s.matches as number) || 0,
      league: (s.league as string) || undefined,
      photoUrl: (s.photoUrl as string) || undefined,
    }));
  } catch (err) {
    console.error('Failed to fetch scorers from API:', err);
    return [];
  }
}

async function fetchStandingsFromAPI(): Promise<Standing[]> {
  try {
    const res = await fetch('/api/standings');
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((s: Record<string, unknown>) => ({
      position: (s.position as number) || 0,
      team: (s.team as string) || '',
      teamLogo: (s.teamLogo as string) || undefined,
      played: (s.played as number) || 0,
      won: (s.won as number) || 0,
      drawn: (s.drawn as number) || 0,
      lost: (s.lost as number) || 0,
      gf: (s.gf as number) || 0,
      ga: (s.ga as number) || 0,
      gd: (s.gd as number) || 0,
      points: (s.points as number) || 0,
      form: parseJSON<string[]>(s.form as string, []),
      league: (s.league as string) || undefined,
    }));
  } catch (err) {
    console.error('Failed to fetch standings from API:', err);
    return [];
  }
}

// --- Utility ---
interface MatchEvent {
  type: string;
  team: string;
  player: string;
  minute: number;
}

function parseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// --- Hook ---

const WS_CONNECT_TIMEOUT = 3000; // Wait 3s for WS before falling back to REST
const REST_POLL_INTERVAL = 15000; // Poll REST API every 15s as fallback

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectedClients, setConnectedClients] = useState(0);

  const [dataSource, setDataSource] = useState<'ws' | 'rest' | null>(null);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const goalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const wsConnectedRef = useRef(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restPollingRef = useRef(false);
  const wsDisabledRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  // Fetch all data from REST API
  const fetchAllFromREST = useCallback(async () => {
    const [matchesData, scorersData, standingsData] = await Promise.all([
      fetchMatchesFromAPI(),
      fetchScorersFromAPI(),
      fetchStandingsFromAPI(),
    ]);

    if (matchesData.length > 0) setMatches(matchesData);
    if (scorersData.length > 0) setScorers(scorersData);
    if (standingsData.length > 0) setStandings(standingsData);

    const hasAnyData = matchesData.length > 0 || scorersData.length > 0 || standingsData.length > 0;

    if (hasAnyData) {
      if (!wsConnectedRef.current) {
        setDataSource('rest');
        setIsConnected(true);
        setIsReconnecting(false);
      }
    } else {
      // No data from REST API — mark as loaded but show "offline/static" state
      // This prevents the UI from being stuck at "Connecting to live data..." forever
      if (!wsConnectedRef.current) {
        setDataSource('rest');
        setIsConnected(true);
        setIsReconnecting(false);
      }
    }

    setLastUpdate(new Date());
    setIsLoading(false);
  }, []);

  // Start polling REST API as fallback
  const startRESTPolling = useCallback(() => {
    if (restPollingRef.current) return; // Already polling
    restPollingRef.current = true;
    console.log('[GOALZONE] WebSocket unavailable, falling back to REST API polling');
    fetchAllFromREST();
    restIntervalRef.current = setInterval(fetchAllFromREST, REST_POLL_INTERVAL);
  }, [fetchAllFromREST]);

  // Stop REST polling when WebSocket connects
  const stopRESTPolling = useCallback(() => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    restPollingRef.current = false;
  }, []);

  useEffect(() => {
    // If WebSocket is explicitly disabled (production without WS server),
    // skip socket initialization entirely and go straight to REST polling.
    if (isWebSocketDisabled()) {
      console.log('[GOALZONE] WebSocket disabled by config, using REST API only');
      wsDisabledRef.current = true;
      // Schedule REST polling asynchronously to avoid synchronous setState in effect
      const timer = setTimeout(() => startRESTPolling(), 0);
      return () => clearTimeout(timer);
    }

    let socket: Socket | null = null;

    try {
      socket = getSocket();
      if (socket) {
        socket.connect();
        socketRef.current = socket;
      }
    } catch (err) {
      console.error('[GOALZONE] Failed to initialize WebSocket:', err);
    }

    // If socket is null (shouldn't happen unless disabled), fall back to REST
    if (!socket) {
      const timer = setTimeout(() => startRESTPolling(), 0);
      return () => clearTimeout(timer);
    }

    // Set a timeout to fall back to REST API if WS doesn't connect
    fallbackTimerRef.current = setTimeout(() => {
      if (!wsConnectedRef.current) {
        startRESTPolling();
      }
    }, WS_CONNECT_TIMEOUT);

    // --- Connection lifecycle ---

    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      wsConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;
      setWsReconnectAttempts(0);
      setDataSource('ws');
      stopRESTPolling();

      // Clear fallback timer
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      wsConnectedRef.current = false;
      setDataSource(null);

      console.log(`[GOALZONE] WebSocket disconnected: ${reason}`);

      // Don't immediately show "Offline" — start REST fallback.
      // The REST fetch will update isConnected to true if it gets data,
      // preventing the UI from showing "Offline" when data is still available.
      setIsReconnecting(true);
      startRESTPolling();
    });

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttemptsRef.current = attempt;
      setWsReconnectAttempts(attempt);
      setIsReconnecting(true);
    });

    socket.on('reconnect', () => {
      setIsReconnecting(false);
      wsConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;
      setWsReconnectAttempts(0);
      stopRESTPolling();
    });

    socket.on('reconnect_failed', () => {
      console.log('[GOALZONE] WebSocket reconnection attempts exhausted. Staying on REST API mode.');
      setIsReconnecting(false);
      setWsReconnectAttempts(-1); // -1 means max attempts reached
      // REST polling should already be running, but ensure it
      startRESTPolling();
    });

    // --- Data events ---

    socket.on('initialData', (data: InitialDataPayload) => {
      setMatches(data.matches);
      setScorers(data.scorers);
      setStandings(data.standings);
      setLastUpdate(new Date(data.timestamp));
      setIsLoading(false);
    });

    socket.on('liveMatchesUpdate', (data: LiveMatchesUpdatePayload) => {
      setMatches((prev) => {
        const newMap = new Map(data.matches.map((m) => [m.id, m]));
        const updated = prev.map((old) => {
          const fresh = newMap.get(old.id);
          if (!fresh) return old;
          if (
            old.homeScore !== fresh.homeScore ||
            old.awayScore !== fresh.awayScore ||
            old.status !== fresh.status ||
            old.minute !== fresh.minute ||
            old.events.length !== fresh.events.length
          ) {
            return fresh;
          }
          return old;
        });

        const prevIds = new Set(prev.map((m) => m.id));
        for (const m of data.matches) {
          if (!prevIds.has(m.id)) {
            updated.push(m);
          }
        }

        return updated;
      });
      setLastUpdate(new Date(data.timestamp));
      setIsLoading(false);
    });

    socket.on('goalScored', (goal: GoalEvent) => {
      const eventKey = `${goal.fixtureId}-${goal.scoringTeam}-${goal.minute}-${goal.playerName}`;

      setGoalEvents((prev) => {
        if (prev.some((e) => `${e.fixtureId}-${e.scoringTeam}-${e.minute}-${e.playerName}` === eventKey)) {
          return prev;
        }
        return [...prev, goal];
      });

      const existingTimer = goalTimersRef.current.get(eventKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        setGoalEvents((prev) =>
          prev.filter(
            (e) => `${e.fixtureId}-${e.scoringTeam}-${e.minute}-${e.playerName}` !== eventKey
          )
        );
        goalTimersRef.current.delete(eventKey);
      }, 5000);

      goalTimersRef.current.set(eventKey, timer);
    });

    socket.on('clientCount', (count: number) => {
      setConnectedClients(count);
    });

    // --- Cleanup ---

    return () => {
      // Clear all goal event timers
      goalTimersRef.current.forEach((timer) => clearTimeout(timer));
      goalTimersRef.current.clear();

      // Clear fallback timer
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      // Stop REST polling
      stopRESTPolling();

      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [startRESTPolling, stopRESTPolling]);

  // --- Manual data refresh request ---

  const requestUpdate = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('requestUpdate');
    } else {
      // Fallback: refresh from REST API
      fetchAllFromREST();
    }
  }, [fetchAllFromREST]);

  return {
    isConnected,
    isReconnecting,
    isLoading,
    matches,
    scorers,
    standings,
    goalEvents,
    requestUpdate,
    lastUpdate,
    connectedClients,
    dataSource,
    wsReconnectAttempts,
  };
}
