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
// Detect environment: sandbox uses Caddy gateway, local dev connects directly
function getSocketUrl(): string {
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

const SOCKET_OPTIONS: Parameters<typeof io>[1] = {
  path: '/',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying to reconnect
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 10000,
  autoConnect: false,
};

// --- Singleton Socket Instance ---

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance.
 * The socket is lazily initialized on first call and does NOT
 * auto-connect. Call `socket.connect()` when ready.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(getSocketUrl(), SOCKET_OPTIONS);
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
