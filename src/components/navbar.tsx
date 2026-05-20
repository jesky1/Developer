"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Menu, X, Zap, Home, Loader2, LogIn, User, ShieldCheck, LogOut, ChevronDown, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClubLogo } from "@/components/ui/club-logo";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/language-selector";

export interface LoginUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  isActive: boolean;
}

interface NavbarProps {
  currentUser?: LoginUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onChangePassword?: () => void;
  matches?: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string;
    minute: number;
    league: string;
    homeLogo?: string;
    awayLogo?: string;
  }>;
}

const ADMIN_ROLES = ["superadmin", "admin", "editor"];

export function Navbar({ currentUser, onLoginClick, onLogout, onOpenAdmin, onChangePassword, matches = [] }: NavbarProps) {
  const { navigate } = useNavigation();
  const { t } = useTranslation();

  const navLinks = [
    { label: t("nav.home"), href: "/", isRoute: true, key: "home" },
    { label: t("nav.live"), href: "#live", key: "live" },
    { label: t("nav.scores"), href: "#scores", key: "scores" },
    { label: t("nav.news"), href: "#news", key: "news" },
    { label: t("nav.standings"), href: "#standings", key: "standings" },
  ];
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time search filtering with useMemo
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return matches.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery, matches]);

  const isSearching = false;

  const handleSearchSelect = useCallback(
    (matchId: string) => {
      navigate(`/match/${matchId}`);
      setSearchOpen(false);
      setSearchQuery("");
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    setUserDropdownOpen(false);
    onLogout?.();
  }, [onLogout]);

  const handleOpenAdmin = useCallback(() => {
    setUserDropdownOpen(false);
    onOpenAdmin?.();
  }, [onOpenAdmin]);

  const handleChangePassword = useCallback(() => {
    setUserDropdownOpen(false);
    onChangePassword?.();
  }, [onChangePassword]);

  // Get initials for avatar
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : currentUser?.username
      ? currentUser.username[0].toUpperCase()
      : "?";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "glass-card neon-glow shadow-lg shadow-black/30"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo — Clickable Home Button */}
          <motion.button
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/")}
            aria-label="Go to Home page"
          >
            <div className="relative">
              <Zap className="w-7 h-7 text-neon" />
              <div className="absolute inset-0 w-7 h-7 text-neon blur-sm opacity-50">
                <Zap className="w-7 h-7" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-wider neon-text">
              GOAL<span className="text-neon">ZONE</span>
            </span>
          </motion.button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isHome = link.key === "home";
              return (
                <motion.a
                  key={link.key}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.href);
                  }}
                  className="relative px-4 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isHome && <Home className="w-3.5 h-3.5" />}
                  <span>{link.label}</span>
                </motion.a>
              );
            })}
          </div>

          {/* Search, Theme Toggle & User */}
          <div className="flex items-center gap-2 relative">
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  ref={searchRef}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-visible relative"
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("nav.search")}
                      className="h-9 pl-8 pr-3 bg-surface-light border-neon/20 focus:border-neon/50 text-sm"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden"
                      >
                        <div className="p-1.5">
                          {searchResults.map((match) => (
                            <button
                              key={match.id}
                              onClick={() => handleSearchSelect(match.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neon/10 transition-colors text-left group"
                            >
                              <ClubLogo name={match.homeTeam} src={match.homeLogo} size="xs" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground truncate">
                                  {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {match.league} &bull; {match.status === "LIVE" ? `${match.minute}'` : match.status}
                                </div>
                              </div>
                              <span className="text-xs font-bold tabular-nums text-neon">
                                {match.homeScore}-{match.awayScore}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* No results */}
                  <AnimatePresence>
                    {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl shadow-black/30 z-50 p-4 text-center"
                      >
                        <p className="text-xs text-muted-foreground">{t("nav.noMatchesFound")} &ldquo;{searchQuery}&rdquo;</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-neon hover:bg-neon/10"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) {
                  setSearchQuery("");
                }
              }}
            >
              <Search className="w-4 h-4" />
            </Button>
            <LanguageSelector />
            <ThemeToggle />

            {/* Login Button / User Dropdown */}
            {currentUser ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neon/10 transition-colors cursor-pointer"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      className="w-7 h-7 rounded-full object-cover border border-neon/20"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-neon/20 border border-neon/30 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-neon">{userInitials}</span>
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[80px] truncate">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-56 bg-background/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {currentUser.displayName || currentUser.username}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neon/10 text-neon border border-neon/20">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {currentUser.role}
                          </span>
                        )}
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        {isAdmin && (
                          <button
                            onClick={handleOpenAdmin}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neon/10 transition-colors text-left"
                          >
                            <ShieldCheck className="w-4 h-4 text-neon" />
                            <span className="text-sm text-foreground">{t("nav.admin")}</span>
                          </button>
                        )}
                        <button
                          onClick={handleChangePassword}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neon/10 transition-colors text-left"
                        >
                          <KeyRound className="w-4 h-4 text-neon" />
                          <span className="text-sm text-foreground">{t("nav.changePassword")}</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-500">{t("nav.logout")}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-neon hover:bg-neon/10"
                onClick={onLoginClick}
                title={t("nav.login")}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">{t("nav.login")}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-neon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden glass-card border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const isHome = link.key === "home";
                return (
                  <a
                    key={link.key}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      navigate(link.href);
                    }}
                  >
                    {isHome && <Home className="w-3.5 h-3.5" />}
                    {link.label}
                  </a>
                );
              })}

              {/* Mobile Login/User */}
              {currentUser ? (
                <>
                  <div className="border-t border-white/5 my-2" />
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.displayName || currentUser.username}
                        className="w-8 h-8 rounded-full object-cover border border-neon/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neon/20 border border-neon/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-neon">{userInitials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {currentUser.displayName || currentUser.username}
                      </p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neon/10 text-neon border border-neon/20">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {currentUser.role}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleOpenAdmin();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-neon hover:bg-neon/10"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {t("nav.admin")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleChangePassword();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-neon hover:bg-neon/10"
                  >
                    <KeyRound className="w-4 h-4" />
                    {t("nav.changePassword")}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-white/5 my-2" />
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLoginClick?.();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-neon hover:bg-neon/10"
                  >
                    <LogIn className="w-4 h-4" />
                    {t("nav.login")}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("nav.search")}
                  className="h-9 pl-8 pr-3 bg-surface-light border-white/10 focus:border-neon/50 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Mobile Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-surface-light/80 border border-white/10 rounded-xl overflow-hidden">
                  {searchResults.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => {
                        handleSearchSelect(match.id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-neon/10 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      <ClubLogo name={match.homeTeam} src={match.homeLogo} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {match.league} &bull; {match.status === "LIVE" ? `${match.minute}'` : match.status}
                        </div>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-neon">
                        {match.homeScore}-{match.awayScore}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
