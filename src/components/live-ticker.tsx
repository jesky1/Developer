"use client";


import { useState } from "react";

import { useTranslation } from "@/lib/i18n";


interface Match {

  id: string;

  homeTeam: string;

  awayTeam: string;

  homeScore: number;

  awayScore: number;

  status: string;

  minute: number;

  league: string;

}


interface LiveTickerProps {

  matches: Match[];

}


export function LiveTicker({ matches }: LiveTickerProps) {

  const [isPaused, setIsPaused] = useState(false);

  const { t } = useTranslation();


  const liveMatches = matches.filter((m) => m.status === "LIVE" || m.status === "HT");

  const otherMatches = matches.filter((m) => m.status !== "LIVE" && m.status !== "HT");

  const topMatches = [...liveMatches, ...otherMatches].slice(0, 5);

  const tickerMatches = [...topMatches, ...topMatches];


  if (matches.length === 0) {

    return (

      <div className="glass-card rounded-xl p-4 overflow-hidden">

        <div className="flex items-center gap-3 h-10">

          <div className="w-48 h-6 bg-surface-light rounded animate-pulse" />

          <div className="w-48 h-6 bg-surface-light rounded animate-pulse" />

          <div className="w-48 h-6 bg-surface-light rounded animate-pulse" />

        </div>

      </div>

    );

  }


  return (

    <div className="glass-card rounded-xl overflow-hidden relative">

      {/* Fade edges */}

      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />

      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />


      <div

        className="flex items-center gap-6 py-3 px-2 overflow-hidden"

        onMouseEnter={() => setIsPaused(true)}

        onMouseLeave={() => setIsPaused(false)}

      >

        <div

          className="flex items-center gap-6 whitespace-nowrap ticker-animate"

          style={{

            animationPlayState: isPaused ? "paused" : "running",
            animationDuration: "120s",

          }}

        >

          {tickerMatches.map((match, i) => (

            <div

              key={`${match.id}-${i}`}

              className="flex items-center gap-3 px-4 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"

            >

              <div className="flex items-center gap-2">

                {match.status === "LIVE" && (

                  <span className="flex items-center gap-1">

                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-pulse" />

                    <span className="text-[10px] font-bold text-green-400 uppercase">

                      {t("status.live")} {match.minute}&apos;

                    </span>

                  </span>

                )}

                {match.status === "HT" && (

                  <span className="text-[10px] font-bold text-yellow-400 uppercase">HT</span>

                )}

                {match.status === "FT" && (

                  <span className="text-[10px] font-bold text-muted-foreground uppercase">FT</span>

                )}

                {match.status === "UPCOMING" && (

                  <span className="text-[10px] font-bold text-blue-400 uppercase">

                    {t("status.upcoming")}

                  </span>

                )}

              </div>

              <span className="text-xs text-muted-foreground">{match.league}</span>

              <span className="text-sm font-medium text-foreground">

                {match.homeTeam}{" "}

                <span className={`font-bold ${match.status === "LIVE" ? "text-neon" : "text-foreground"}`}>

                  {match.homeScore} - {match.awayScore}

                </span>{" "}

                {match.awayTeam}

              </span>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

} 