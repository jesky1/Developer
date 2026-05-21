"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export function LiveTicker({ matches }: { matches: any[] }) {
  const [isPaused, setIsPaused] = useState(false);
  const { t } = useTranslation();

  if (matches.length === 0) return null;

  // Duplikasi data agar tidak putus di tengah jalan saat berputar
  const tickerMatches = [...matches, ...matches, ...matches];

  return (
    <div className="glass-card rounded-xl overflow-hidden relative py-3 px-2">
      {/* SUNTIKAN CSS INSTAN UNTUK MEMPERLAMBAT TEKS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pelan { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-33.33%,0,0); } }
        .ticker-slow { animation: pelan 60s linear infinite !important; }
      `}} />

      <div
        className="flex items-center gap-6 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex items-center gap-6 whitespace-nowrap ticker-slow"
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        >
          {tickerMatches.map((match, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-sm font-medium">
              <span className="text-[10px] font-bold uppercase text-neon">
                {match.status === "LIVE" ? `${t("status.live")} ${match.minute}'` : match.status}
              </span>
              <span className="text-xs text-muted-foreground">{match.league}</span>
              <span>
                {match.homeTeam} <span className="font-bold text-neon">{match.homeScore} - {match.awayScore}</span> {match.awayTeam}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
