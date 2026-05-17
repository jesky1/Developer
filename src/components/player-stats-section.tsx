"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, ChevronDown, Loader2, Star, Target, Shield, Swords,
    TrendingUp, Award, Search, Database, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, ExternalLink
} from "lucide-react";
import { ClubLogo } from "@/components/ui/club-logo";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// === Types ===

interface PlayerStats {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    position: string;
    currentClub: string;
    clubLogo?: string;
    teamLogo?: string;
    rating: number;
    age?: number;
    nationality?: string;
    shirtNumber?: number;
    apiFootballId?: number;
    stats?: {
        totalMatches: number;
        goals: number;
        assists: number;
        shots: number;
        shotsOnTarget: number;
        passingAccuracy: number;
        tackles: number;
        interceptions: number;
        fouls: number;
        yellowCards: number;
        redCards: number;
        rating: number;
        season: string;
        lineups?: number;
        minutes?: number;
        dribblesAttempts?: number;
        dribblesSuccess?: number;
        duelsTotal?: number;
        duelsWon?: number;
        saves?: number;
        penaltyScored?: number;
        isCaptain?: boolean;
    } | null;
}

interface SyncStatus {
    configuration: {
        dataMode: string;
        apiKeySet: boolean;
        apiKeyPreview: string;
        apiHost: string;
        isRealDataMode: boolean;
    };
    database: {
        players: number;
        playerStats: number;
    };
    availableLeagues: Record<string, { id: number; name: string }>;
}

interface SyncResult {
    success: boolean;
    message: string;
    created: number;
    updated: number;
    skipped?: number;
    errors?: number;
    total: number;
}

// === League options ===

const LEAGUE_OPTIONS = [
    { name: "Premier League", id: 39 },
    { name: "La Liga", id: 140 },
    { name: "Serie A", id: 135 },
    { name: "Bundesliga", id: 78 },
    { name: "Ligue 1", id: 61 },
    { name: "Champions League", id: 2 },
    { name: "Eredivisie", id: 88 },
    { name: "Liga 1 Indonesia", id: 294 },
] as const;

const POSITION_OPTIONS = [
    { name: "All", value: "" },
    { name: "Forward", value: "FW" },
    { name: "Midfielder", value: "MF" },
    { name: "Defender", value: "DF" },
    { name: "Goalkeeper", value: "GK" },
] as const;

// === API Connection Status Badge ===

function ApiStatusBadge({ status }: { status: SyncStatus | null }) {
    if (!status) return null;

    const isConfigured = status.configuration.isRealDataMode;
    const hasPlayers = status.database.players > 0;

    return (
        <div className="flex items-center gap-2">
            <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
                isConfigured
                    ? "bg-green-500/10 border border-green-500/20 text-green-500"
                    : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
            )}>
                {isConfigured ? (
                    <>
                        <CheckCircle2 className="w-3 h-3" />
                        API Connected
                    </>
                ) : (
                    <>
                        <AlertCircle className="w-3 h-3" />
                        API Not Configured
                    </>
                )}
            </div>
            {hasPlayers && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neon/10 border border-neon/20 text-neon">
                    <Database className="w-3 h-3" />
                    {status.database.players} players
                </div>
            )}
        </div>
    );
}

// === Player Stats Card ===

function PlayerStatsCard({
    player,
    onClick,
}: {
    player: PlayerStats;
    onClick?: (player: PlayerStats) => void;
}) {
    const stats = player.stats;
    const positionColors: Record<string, string> = {
        FW: "bg-red-500/15 text-red-400 border-red-500/25",
        MF: "bg-green-500/15 text-green-400 border-green-500/25",
        DF: "bg-blue-500/15 text-blue-400 border-blue-500/25",
        GK: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "glass-card rounded-xl p-4 transition-all",
                onClick
                    ? "cursor-pointer hover:bg-white/[0.06] hover:border-neon/20 hover:shadow-lg hover:shadow-neon/5"
                    : ""
            )}
            onClick={() => onClick?.(player)}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Header: Photo + Name + Position */}
            <div className="flex items-start gap-3 mb-3">
                <div className="relative shrink-0">
                    <ClubLogo
                        name={player.name}
                        src={player.photoUrl}
                        size="md"
                        variant="circle"
                    />
                    {player.stats?.isCaptain && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-[7px] font-bold text-black">C</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground truncate">{player.name}</h4>
                        {player.shirtNumber ? (
                            <span className="text-[10px] text-muted-foreground font-mono">#{player.shirtNumber}</span>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <ClubLogo
                            name={player.currentClub}
                            src={player.teamLogo}
                            size="xs"
                            variant="circle"
                        />
                        <span className="text-[11px] text-muted-foreground truncate">{player.currentClub}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                            positionColors[player.position] || "bg-surface-light text-muted-foreground border-white/10"
                        )}>
                            {player.position}
                        </span>
                        {player.nationality && (
                            <span className="text-[9px] text-muted-foreground">{player.nationality}</span>
                        )}
                    </div>
                </div>

                {/* Rating */}
                {stats && stats.rating > 0 && (
                    <div className="flex flex-col items-center shrink-0">
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                            stats.rating >= 7.5
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : stats.rating >= 6.5
                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>
                            {stats.rating.toFixed(1)}
                        </div>
                        <span className="text-[8px] text-muted-foreground mt-0.5">Rating</span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-foreground">{stats.totalMatches}</div>
                        <div className="text-[8px] text-muted-foreground uppercase">Apps</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-neon">{stats.goals}</div>
                        <div className="text-[8px] text-muted-foreground uppercase">Goals</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-emerald-400">{stats.assists}</div>
                        <div className="text-[8px] text-muted-foreground uppercase">Assists</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-sm font-bold text-foreground">{stats.minutes || 0}</div>
                        <div className="text-[8px] text-muted-foreground uppercase">Mins</div>
                    </div>
                </div>
            )}

            {/* Detailed Stats Row */}
            {stats && (
                <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
                    {stats.shots > 0 && (
                        <span className="flex items-center gap-0.5"><Target className="w-2.5 h-2.5" />{stats.shotsOnTarget}/{stats.shots}</span>
                    )}
                    {stats.tackles > 0 && (
                        <span className="flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />{stats.tackles} tackles</span>
                    )}
                    {stats.dribblesSuccess != null && stats.dribblesSuccess > 0 && (
                        <span className="flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />{stats.dribblesSuccess} dribbles</span>
                    )}
                    {stats.passingAccuracy > 0 && (
                        <span className="flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />{stats.passingAccuracy}% pass</span>
                    )}
                    {(stats.yellowCards > 0 || stats.redCards > 0) && (
                        <span className="flex items-center gap-1">
                            {stats.yellowCards > 0 && <span className="text-yellow-400">🟨{stats.yellowCards}</span>}
                            {stats.redCards > 0 && <span className="text-red-400">🟥{stats.redCards}</span>}
                        </span>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// === Sync Panel (for admin) ===

function SyncPanel({
    syncStatus,
    onSync,
    isSyncing,
    syncResult,
}: {
    syncStatus: SyncStatus | null;
    onSync: (leagueId: number, season: number) => void;
    isSyncing: boolean;
    syncResult: SyncResult | null;
}) {
    const [selectedLeague, setSelectedLeague] = useState(39);
    const [season, setSeason] = useState(2024);
    const [showPanel, setShowPanel] = useState(false);

    return (
        <div className="glass-card rounded-2xl p-5">
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="w-full flex items-center justify-between cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-neon" />
                    <h3 className="text-sm font-semibold text-foreground">API-Football Sync</h3>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    showPanel && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {showPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 space-y-4">
                            {/* Config Status */}
                            {syncStatus && (
                                <div className="bg-white/[0.03] rounded-lg p-3 text-[11px] space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">API Mode:</span>
                                        <span className={cn(
                                            "font-semibold",
                                            syncStatus.configuration.isRealDataMode ? "text-green-400" : "text-yellow-400"
                                        )}>
                                            {syncStatus.configuration.dataMode.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">API Key:</span>
                                        <span className="font-mono text-foreground">{syncStatus.configuration.apiKeyPreview}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">DB Players:</span>
                                        <span className="font-semibold text-neon">{syncStatus.database.players}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">DB Stats:</span>
                                        <span className="font-semibold text-neon">{syncStatus.database.playerStats}</span>
                                    </div>
                                </div>
                            )}

                            {/* Sync Controls */}
                            <div className="flex items-center gap-3">
                                <select
                                    value={selectedLeague}
                                    onChange={(e) => setSelectedLeague(Number(e.target.value))}
                                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-neon/50"
                                >
                                    {LEAGUE_OPTIONS.map((l) => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={season}
                                    onChange={(e) => setSeason(Number(e.target.value))}
                                    className="w-24 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-neon/50"
                                >
                                    <option value={2024}>2024</option>
                                    <option value={2023}>2023</option>
                                    <option value={2022}>2022</option>
                                </select>
                            </div>

                            <button
                                onClick={() => onSync(selectedLeague, season)}
                                disabled={isSyncing}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all",
                                    isSyncing
                                        ? "bg-white/[0.04] text-muted-foreground cursor-not-allowed"
                                        : "bg-neon/10 border border-neon/30 text-neon hover:bg-neon/20 cursor-pointer"
                                )}
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Sync Players (Page 1)
                                    </>
                                )}
                            </button>

                            {/* Sync Result */}
                            {syncResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "rounded-lg p-3 text-[11px]",
                                        syncResult.success
                                            ? "bg-green-500/10 border border-green-500/20"
                                            : "bg-red-500/10 border border-red-500/20"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {syncResult.success ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                                        )}
                                        <span className={cn(
                                            "font-semibold",
                                            syncResult.success ? "text-green-400" : "text-red-400"
                                        )}>
                                            {syncResult.message}
                                        </span>
                                    </div>
                                    {syncResult.success && (
                                        <div className="text-muted-foreground ml-5.5">
                                            Created: {syncResult.created} | Updated: {syncResult.updated} | Total: {syncResult.total}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Instructions if not configured */}
                            {syncStatus && !syncStatus.configuration.isRealDataMode && (
                                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-[10px] text-yellow-400 space-y-1.5">
                                    <p className="font-semibold">⚠️ API-Football not configured</p>
                                    <p>1. Register at <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">api-football.com <ExternalLink className="w-2.5 h-2.5" /></a></p>
                                    <p>2. Get your API key from the dashboard</p>
                                    <p>3. Set env vars: <code className="bg-white/10 px-1 rounded">DATA_MODE=real</code> and <code className="bg-white/10 px-1 rounded">FOOTBALL_API_KEY=your_key</code></p>
                                    <p>4. For Vercel: Settings → Environment Variables</p>
                                    <p>5. Redeploy after changes</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// === Main PlayerStatsSection Component ===

export function PlayerStatsSection({
    onPlayerClick,
}: {
    onPlayerClick?: (playerName: string) => void;
}) {
    const { t } = useTranslation();
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPosition, setSelectedPosition] = useState("");
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    // Fetch players from database
    const fetchPlayers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("name", searchQuery);
            if (selectedPosition) params.set("position", selectedPosition);
            params.set("limit", "50");

            const res = await fetch(`/api/players?${params}`);
            if (!res.ok) throw new Error("Failed to fetch players");
            const data = await res.json();

            const mapped: PlayerStats[] = (data || []).map((p: Record<string, unknown>) => ({
                id: p.id as string,
                name: p.name as string,
                firstName: p.firstName as string,
                lastName: p.lastName as string,
                photoUrl: p.photoUrl as string,
                position: p.position as string,
                currentClub: p.currentClub as string,
                clubLogo: p.clubLogo as string,
                teamLogo: p.teamLogo as string,
                rating: (p.rating as number) || 0,
                age: p.age as number,
                nationality: p.nationality as string,
                shirtNumber: p.shirtNumber as number,
                apiFootballId: p.apiFootballId as number,
                stats: p.stats as PlayerStats["stats"],
            }));

            setPlayers(mapped);
        } catch (err) {
            console.error("Error fetching players:", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedPosition]);

    // Fetch sync status
    const fetchSyncStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/players/sync");
            if (!res.ok) return;
            const data = await res.json();
            setSyncStatus(data);
        } catch {
            // ignore
        }
    }, []);

    // Sync players from API-Football
    const handleSync = useCallback(async (leagueId: number, season: number) => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch("/api/players/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leagueId, season, page: 1 }),
            });
            const data = await res.json();
            setSyncResult(data);
            if (data.success) {
                // Refresh players list and sync status
                await fetchPlayers();
                await fetchSyncStatus();
            }
        } catch (err: any) {
            setSyncResult({
                success: false,
                message: err.message || "Sync failed",
                created: 0,
                updated: 0,
                total: 0,
            });
        } finally {
            setIsSyncing(false);
        }
    }, [fetchPlayers, fetchSyncStatus]);

    useEffect(() => {
        fetchPlayers();
        fetchSyncStatus();
    }, [fetchPlayers, fetchSyncStatus]);

    // Debounced search
    const [searchInput, setSearchInput] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    return (
        <section id="player-stats" className="space-y-5">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-neon" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">
                            {t("players.title", "Player Statistics")}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            {t("players.subtitle", "Powered by API-Football • Current Season Stats")}
                        </p>
                    </div>
                </div>
                <ApiStatusBadge status={syncStatus} />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t("players.search", "Search players...")}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    {POSITION_OPTIONS.map((pos) => (
                        <button
                            key={pos.value}
                            onClick={() => setSelectedPosition(pos.value)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                                selectedPosition === pos.value
                                    ? "bg-neon/15 border border-neon/30 text-neon"
                                    : "bg-white/[0.04] border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
                            )}
                        >
                            {t(`players.pos.${pos.value || "all"}`, pos.name)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sync Panel */}
            <SyncPanel
                syncStatus={syncStatus}
                onSync={handleSync}
                isSyncing={isSyncing}
                syncResult={syncResult}
            />

            {/* Player Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-white/5" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-2/3" />
                                    <div className="h-2 bg-white/5 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="bg-white/[0.03] rounded-lg p-2 h-10" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : players.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                        {t("players.noData", "No player data available")}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                        {syncStatus?.configuration.isRealDataMode
                            ? t("players.syncHint", "Use the Sync panel above to import player data from API-Football")
                            : t("players.configHint", "Configure API-Football to sync real player data")
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {players.map((player) => (
                            <PlayerStatsCard
                                key={player.id}
                                player={player}
                                onClick={onPlayerClick ? () => onPlayerClick(player.name) : undefined}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Load more hint */}
            {players.length >= 50 && (
                <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">
                        {t("players.showing", "Showing top 50 players by rating. Use search or filters to find more.")}
                    </p>
                </div>
            )}
        </section>
    );
}
