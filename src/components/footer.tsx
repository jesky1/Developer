"use client";

import { useState, useCallback } from "react";
import { Zap, Trophy, MapPin } from "lucide-react";
import { LegalPagesModal, type LegalPage } from "@/components/legal-pages-modal";
import { useTranslation } from "@/lib/i18n";

// === League Config ===

interface LeagueInfo {
  name: string;
  code: string;
  country: string;
}

const LEAGUES: LeagueInfo[] = [
  { name: "Premier League", code: "ENG", country: "England" },
  { name: "La Liga", code: "ESP", country: "Spain" },
  { name: "Serie A", code: "ITA", country: "Italy" },
  { name: "Bundesliga", code: "GER", country: "Germany" },
  { name: "Ligue 1", code: "FRA", country: "France" },
  { name: "Champions League", code: "UCL", country: "Europe" },
  { name: "Eredivisie", code: "NED", country: "Netherlands" },
  { name: "Liga 1 Indonesia", code: "IDN", country: "Indonesia" },
];

// === Props ===

interface FooterProps {
  onLeagueClick?: (leagueName: string) => void;
}

// === Main Component ===

export function Footer({ onLeagueClick }: FooterProps) {
  const { t } = useTranslation();
  const [openPage, setOpenPage] = useState<LegalPage | null>(null);

  const LEGAL_LINKS: { label: string; page: LegalPage }[] = [
    { label: t("footer.aboutUs"), page: "about" },
    { label: t("footer.contact"), page: "contact" },
    { label: t("footer.privacyPolicy"), page: "privacy" },
    { label: t("footer.termsOfService"), page: "terms" },
  ];

  const NAV_LINKS = [
    { label: t("footer.liveScores"), href: "#live" },
    { label: t("footer.fixtures"), href: "#live" },
    { label: t("footer.results"), href: "#live" },
    { label: t("footer.standings"), href: "#standings" },
  ];

  const handleLeagueClick = useCallback(
    (leagueName: string) => {
      if (onLeagueClick) {
        onLeagueClick(leagueName);
      } else {
        // Fallback: just scroll to standings
        const el = document.getElementById("standings");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [onLeagueClick]
  );

  const handleLegalClick = useCallback((page: LegalPage) => {
    setOpenPage(page);
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpenPage(null);
  }, []);

  return (
    <>
      <footer className="mt-auto border-t border-white/5 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-neon" />
                <span className="text-lg font-bold neon-text">
                  GOAL<span className="text-neon">ZONE</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                {t("footer.description")}
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                {t("footer.navigation")}
              </h4>
              <ul className="space-y-2">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-xs text-muted-foreground hover:text-neon transition-colors inline-flex items-center gap-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Leagues */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-neon" />
                {t("footer.leagues")}
              </h4>
              <ul className="space-y-2">
                {LEAGUES.map((league) => (
                  <li key={league.name}>
                    <button
                      onClick={() => handleLeagueClick(league.name)}
                      className="text-xs text-muted-foreground hover:text-neon transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground/40" />
                      {league.name}
                      <span className="text-[9px] text-muted-foreground/40">({league.code})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                {t("footer.legal")}
              </h4>
              <ul className="space-y-2">
                {LEGAL_LINKS.map((item) => (
                  <li key={item.page}>
                    <button
                      onClick={() => handleLegalClick(item.page)}
                      className="text-xs text-muted-foreground hover:text-neon transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              {t("footer.copyright")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("footer.dataRefresh")}
            </p>
          </div>
        </div>
      </footer>

      {/* Legal Pages Modal */}
      <LegalPagesModal
        page={openPage}
        isOpen={openPage !== null}
        onClose={handleCloseModal}
      />
    </>
  );
}
