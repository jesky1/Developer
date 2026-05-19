'use client';

import { io, Socket } from 'socket.io-client';

// --- TypeScript Interfaces for Socket Events ---

export interface MatchEvent {
  type: string;
  team: string;
  player: string;
  minute: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  minute: number;
  league: string;
  leagueLogo?: string;
  homeLogo?: string;
  awayLogo?: string;
  stadium: string;
  kickoff: string;
  events: MatchEvent[];
  isHot: boolean;
  poll?: {
    homeVotes: number;
    drawVotes: number;
    awayVotes: number;
  };
  homeForm: string[];
  awayForm: string[];
}

export interface Scorer {
  id?: string;
  name: string;
  team: string;
  teamLogo?: string;
  goals: number;
  assists: number;
  matches: number;
  league?: string;
  photoUrl?: string;
}

export interface Standing {
  position: number;
  team: string;
  teamLogo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[];
  league?: string;
}

export interface GoalEvent {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  minute: number;
  status: string;
  scoringTeam: 'home' | 'away';
  playerName: string;
  homeScore: number;
  awayScore: number;
}

export interface InitialDataPayload {
  matches: Match[];
  scorers: Scorer[];
  standings: Standing[];
  timestamp: string;
}

export interface LiveMatchesUpdatePayload {
  matches: Match[];
  timestamp: string;
}

// --- Socket Connection Config ---

/**
 * Detect environment and determine the correct Socket.io server URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SOCKET_URL env var — set this in Vercel to your external
 *    WebSocket server URL (e.g. https://ws.goalzone.app).
 *    Set to "disabled" to skip WebSocket entirely (REST-only mode).
 * 2. Sandbox (Caddy gateway on port 81) — use relative path with XTransformPort.
 * 3. Local dev / preview — use origin with XTransformPort query param.
 * 4. SSR fallback — localhost:3003.
 */
function getSocketUrl(): string {
  // Check for explicit env var override (production use-case)
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) {
    // "disabled" means skip WebSocket entirely — return empty string (caller checks)
    if (envUrl.toLowerCase() === 'disabled') return '';
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    // Sandbox (Caddy gateway on port 81)
    if (window.location.port === '81') {
      return '/?XTransformPort=3003';
    }
    // Preview panel or direct access (no port or port 3000)
    // Try relative path first which works through any proxy
    return window.location.origin + '/?XTransformPort=3003';
  }
  return 'http://localhost:3003';
}

/**
 * Check if WebSocket is explicitly disabled via environment variable.
 */
export function isWebSocketDisabled(): boolean {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  return envUrl?.toLowerCase() === 'disabled';
}

const SOCKET_OPTIONS: Parameters<typeof io>[1] = {
  path: '/socket.io/',
  // HTTP Polling first, then upgrade to WebSocket if supported.
  // This is critical for Vercel which doesn't support raw WebSocket
  // but may allow long-polling through its edge network.
  transports: ['polling', 'websocket'],
  reconnection: true,
  // Limit reconnection attempts to prevent infinite retry loops
  // that cause aggressive "Offline/Disconnected" flashing.
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  timeout: 15000,
  autoConnect: false,
};

// --- Singleton Socket Instance ---

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance.
 * The socket is lazily initialized on first call and does NOT
 * auto-connect. Call `socket.connect()` when ready.
 *
 * If NEXT_PUBLIC_SOCKET_URL is set to "disabled", returns null.
 */
export function getSocket(): Socket | null {
  if (isWebSocketDisabled()) return null;

  const url = getSocketUrl();
  if (!url) return null;

  if (!socketInstance) {
    socketInstance = io(url, SOCKET_OPTIONS);
  }
  return socketInstance;
}

/**
 * Disconnects and destroys the singleton socket instance.
 * Useful for cleanup or resetting the connection.
 */
export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}