"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { useNavigation, hasSplashBeenShown, markSplashShown } from "@/hooks/use-navigation";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navbar, type LoginUser } from "@/components/navbar";
import { LoginModal } from "@/components/login-modal";
import { RegisterModal, type RegisterUser } from "@/components/register-modal";
import { LiveTicker } from "@/components/live-ticker";
import { FeaturedMatch } from "@/components/featured-match";
import { MatchTimeline } from "@/components/match-timeline";
import { FanPolls } from "@/components/fan-polls";
import { LiveMatchesList } from "@/components/live-matches-list";
import { Sidebar } from "@/components/sidebar-section";
import { FeaturedMatchesGrid } from "@/components/featured-matches-grid";
import { Footer } from "@/components/footer";
import { HotMatchHighlight } from "@/components/hot-match-highlight";
import { NewsSection } from "@/components/news-section";
import { NewsDetailModal } from "@/components/news-detail-modal";
import { StandingsSection } from "@/components/standings-section";
import { PlayerStatsSection } from "@/components/player-stats-section";
import type { NewsArticle } from "@/components/news-section";
// Goal notifications disabled — import commented out
// import { useGoalNotifications } from "@/hooks/use-goal-notifications";
import { useSocket } from "@/hooks/use-socket";
import type { GoalEvent } from "@/services/socket";
import { PlayerDetailModal } from "@/components/player-detail-modal";
import { Wifi, WifiOff, RefreshCw, Loader2, Radio, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Lazy load admin panel - keeps it out of the initial bundle
import dynamic from "next/dynamic";
function AdminLoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">{t('admin.loadingPanel')}</span>
      </div>
    </div>
  );
}

const AdminPanel = dynamic(() => import("@/components/admin/admin-panel"), {
  ssr: false,
  loading: () => <AdminLoadingFallback />,
});

// Lazy load splash screen with ssr: false to avoid hydration mismatch
// The splash uses framer-motion animations + sessionStorage which are client-only
const SplashScreen = dynamic(
  () => import("@/components/splash-screen").then((mod) => ({ default: mod.SplashScreen })),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 z-[100] bg-background" />,
  }
);

// Empty subscribe function for useSyncExternalStore
const emptySubscribe = () => () => { };

const AUTH_KEY = "goalzone_admin_token";
const USER_KEY = "goalzone_user";

const ADMIN_ROLES = ["superadmin", "admin", "editor"];

// Read stored auth state from localStorage (client-only)
function getStoredAuthState(): { user: LoginUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const token = localStorage.getItem(AUTH_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (!token || !userJson) return { user: null, token: null };
    const user = JSON.parse(userJson) as LoginUser;
    // Check if token is expired (simple JWT decode)
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        return { user, token };
      }
    } catch {
      // Token format invalid — still allow (backend validates)
      return { user, token };
    }
    // Token expired — clear storage
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    return { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

// ===== Live Scores View =====
function LiveScoresView({
  currentUser,
  onLoginClick,
  onLogout,
  onOpenAdmin,
}: {
  currentUser: LoginUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}) {
  const {
    isConnected,
    isReconnecting,
    isLoading,
    matches,
    scorers,
    standings,
    goalEvents,
    requestUpdate,
    lastUpdate,
    dataSource,
  } = useSocket();

  // Use useSyncExternalStore to safely read sessionStorage without hydration mismatch.
  // Server always returns false (no splash), client checks sessionStorage.
  const shouldShowSplash = useSyncExternalStore(
    emptySubscribe,
    () => !hasSplashBeenShown(),
    () => false // Server snapshot: never show splash during SSR
  );

  // Track whether splash has been dismissed via the onFinished callback.
  // This is event-handler-based state (not effect-based), so it's lint-safe.
  const [splashDismissed, setSplashDismissed] = useState(false);

  // Show splash only when: should show (sessionStorage) AND not yet dismissed
  const splashActive = shouldShowSplash && !splashDismissed;

  const { navigate, restoreScroll } = useNavigation();
  const { t } = useTranslation();

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isNewsDetailOpen, setIsNewsDetailOpen] = useState(false);

  // Player detail modal state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerDetailOpen, setIsPlayerDetailOpen] = useState(false);

  const handlePlayerClick = useCallback((playerName: string) => {
    // Use playerName for by-name lookup in PlayerDetailModal
    setSelectedPlayerId(playerName);
    setIsPlayerDetailOpen(true);
  }, []);

  const handleTeamClick = useCallback((teamName: string) => {
    const slug = teamName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/team/${slug}`);
  }, [navigate]);
  const [footerSelectedLeague, setFooterSelectedLeague] = useState<string | undefined>(undefined);

  // Goal notifications popup disabled by user request
  // useGoalNotifications(matches);

  // Restore scroll position when component mounts
  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

  const goalMatchIds = new Set(goalEvents.map((g: GoalEvent) => g.fixtureId));

  const handleMatchClick = useCallback((match: Record<string, unknown>) => {
    const matchId = (match as Record<string, unknown>).id as string;
    if (matchId) {
      navigate(`/match/${matchId}`);
    }
  }, [navigate]);

  const handleArticleClick = useCallback((article: NewsArticle) => {
    setSelectedArticle(article);
    setIsNewsDetailOpen(true);
  }, []);

  const handleLeagueClick = useCallback((leagueName: string) => {
    setFooterSelectedLeague(leagueName);
    // Scroll to standings section
    const el = document.getElementById("standings");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const liveMatches = matches.filter((m) => m.status === "LIVE" || m.status === "HT");
  const featuredMatch = liveMatches[0] || matches[0] || null;
  const otherMatches = matches.filter((m) => m.id !== featuredMatch?.id);
  const featuredMatchPoll = featuredMatch?.poll || null;

  const featuredGoalEvent = featuredMatch
    ? goalEvents.find((g: GoalEvent) => g.fixtureId === featuredMatch.id)
    : null;

  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Splash screen — only rendered on client after mount */}
      <AnimatePresence>
        {splashActive && (
          <SplashScreen
            onFinished={() => {
              setSplashDismissed(true);
              markSplashShown();
            }}
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          "transition-opacity duration-500",
          splashActive ? "opacity-0" : "opacity-100"
        )}
      >
        <Navbar
          currentUser={currentUser}
          onLoginClick={onLoginClick}
          onLogout={onLogout}
          onOpenAdmin={onOpenAdmin}
          matches={matches}
        />

        <main className="flex-1 pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                      dataSource === 'ws'
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-emerald-500/10 border border-emerald-500/20"
                    )}
                  >
                    <Wifi className={cn("w-3 h-3", dataSource === 'ws' ? "text-green-500" : "text-emerald-500")} />
                    <span className={cn("text-[10px] font-semibold", dataSource === 'ws' ? "text-green-500" : "text-emerald-500")}>
                      {dataSource === 'ws' ? t('status.live') : t('status.liveApi')}
                    </span>
                    <span className={cn("w-1.5 h-1.5 rounded-full live-pulse", dataSource === 'ws' ? "bg-green-500" : "bg-emerald-500")} />
                  </div>
                ) : isReconnecting ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                    <span className="text-[10px] text-yellow-500 font-semibold">{t('status.connecting')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <WifiOff className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] text-red-500 font-semibold">{t('status.offline')}</span>
                  </div>
                )}

                {isConnected && liveCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Radio className="w-3 h-3 text-green-500" />
                    <span>{liveCount} {liveCount !== 1 ? t('match.liveMatches') : t('match.liveMatch')}</span>
                  </div>
                )}

                {lastUpdate && (
                  <span className="text-[10px] text-muted-foreground">
                    {t('match.updated')} {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={requestUpdate}
                className="flex items-center gap-1 text-[10px] text-neon hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {t('status.refresh')}
              </button>
            </div>

            {isLoading && matches.length === 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="glass-card neon-glow rounded-2xl p-6 space-y-6 animate-pulse">
                    <div className="h-6 bg-surface-light rounded w-1/3" />
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="w-16 h-16 bg-surface-light rounded-full" />
                        <div className="w-20 h-4 bg-surface-light rounded" />
                      </div>
                      <div className="w-24 h-10 bg-surface-light rounded" />
                      <div className="space-y-2">
                        <div className="w-16 h-16 bg-surface-light rounded-full" />
                        <div className="w-20 h-4 bg-surface-light rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="glass-card rounded-2xl p-5 animate-pulse h-48" />
                    <div className="glass-card rounded-2xl p-5 animate-pulse h-48" />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-neon" />
                    <span className="text-sm font-semibold text-foreground">{t('match.connectingData')}</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-neon animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <section id="live">
                  <LiveTicker matches={matches} />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div
                        className="cursor-pointer"
                        onClick={() => featuredMatch && handleMatchClick(featuredMatch)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && featuredMatch) handleMatchClick(featuredMatch);
                        }}
                      >
                        <FeaturedMatch match={featuredMatch} goalFlash={!!featuredGoalEvent} />
                      </div>

                      <div className="space-y-5">
                        <MatchTimeline match={featuredMatch} />
                        <FanPolls match={featuredMatch} poll={featuredMatchPoll} />
                      </div>
                    </div>

                    <LiveMatchesList
                      matches={matches}
                      onMatchClick={handleMatchClick}
                      goalMatchIds={goalMatchIds}
                      isLoading={isLoading}
                    />

                    <FeaturedMatchesGrid
                      matches={otherMatches}
                      onMatchClick={handleMatchClick}
                      goalMatchIds={goalMatchIds}
                      isLoading={isLoading}
                    />
                  </div>

                  <div className="space-y-5">
                    <Sidebar scorers={scorers} standings={standings} onPlayerClick={handlePlayerClick} onTeamClick={handleTeamClick} />
                  </div>
                </div>

                <StandingsSection selectedLeague={footerSelectedLeague} />

                <PlayerStatsSection onPlayerClick={handlePlayerClick} />

                <NewsSection onArticleClick={handleArticleClick} />
              </>
            )}
          </div>
        </main>

        <Footer onLeagueClick={handleLeagueClick} />

        <HotMatchHighlight matches={matches} />

        <NewsDetailModal
          article={selectedArticle}
          isOpen={isNewsDetailOpen}
          onClose={() => {
            setIsNewsDetailOpen(false);
            setSelectedArticle(null);
          }}
        />

        <PlayerDetailModal
          playerId={null}
          playerName={selectedPlayerId}
          isOpen={isPlayerDetailOpen}
          onClose={() => {
            setIsPlayerDetailOpen(false);
            setSelectedPlayerId(null);
          }}
        />
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function HomePage() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  // Initialize auth from localStorage — uses lazy initializer so no effect needed
  const [authState, setAuthState] = useState(() => {
    // This runs once during initial render (client-only logic safe because ssr:false wrapper)
    if (typeof window === "undefined") return { user: null as LoginUser | null, token: null as string | null, initialized: false };
    const stored = getStoredAuthState();
    return { user: stored.user, token: stored.token, initialized: true };
  });
  const currentUser = authState.user;
  const _authToken = authState.token; // used indirectly via localStorage

  const handleLoginSuccess = useCallback((user: LoginUser | RegisterUser, token: string) => {
    // Normalize user object to LoginUser format
    const normalizedUser: LoginUser = {
      id: user.id,
      username: 'displayName' in user ? (user as LoginUser).username : ('name' in user ? (user as RegisterUser).name : ''),
      email: user.email,
      displayName: 'displayName' in user ? (user as LoginUser).displayName : ('name' in user ? (user as RegisterUser).name : ''),
      avatarUrl: 'avatarUrl' in user ? (user as LoginUser).avatarUrl : ('image' in user ? (user as RegisterUser).image : ''),
      role: user.role || 'user',
      isActive: user.isActive,
    };
    setAuthState({ user: normalizedUser, token, initialized: true });
    try {
      localStorage.setItem(AUTH_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    } catch {
      // localStorage might not be available
    }
    setIsLoginOpen(false);
    setIsRegisterOpen(false);

    // If admin role, auto-switch to admin mode
    if (ADMIN_ROLES.includes(normalizedUser.role)) {
      setIsAdminMode(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setAuthState({ user: null, token: null, initialized: true });
    setIsAdminMode(false);
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // localStorage might not be available
    }
    // Also sign out from NextAuth session if active
    fetch('/api/auth/signout', { method: 'POST' }).catch(() => { });
  }, []);

  const handleOpenAdmin = useCallback(() => {
    setIsAdminMode(true);
  }, []);

  // Wait for auth initialization to avoid flash
  if (!authState.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isAdminMode && currentUser && ADMIN_ROLES.includes(currentUser.role) ? (
        <div>
          <AdminPanel onBackToLive={() => setIsAdminMode(false)} />
        </div>
      ) : (
        <LiveScoresView
          currentUser={currentUser}
          onLoginClick={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
        onRegisterSuccess={handleLoginSuccess}
      />
    </>
  );
}
