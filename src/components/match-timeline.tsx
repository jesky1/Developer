"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useTranslation } from "@/lib/i18n";

interface MatchTimelineProps {
  match: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    events: { type: string; team: string; player: string; minute: number }[];
  } | null;
}

export function MatchTimeline({ match }: MatchTimelineProps) {
  const { t } = useTranslation();
  if (!match) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-surface-light rounded w-1/3 mb-4" />
        <div className="h-40 bg-surface-light rounded" />
      </div>
    );
  }

  // Create 15-min interval performance data
  const intervals = ["0-15", "15-30", "30-45", "45-60", "60-75", "75-90"];
  const homeData = intervals.map((interval, i) => {
    const start = i * 15;
    const end = (i + 1) * 15;
    const goals = match.events.filter(
      (e) => e.type === "goal" && e.team === "home" && e.minute > start && e.minute <= end
    ).length;
    const cards = match.events.filter(
      (e) => (e.type === "yellow" || e.type === "red") && e.team === "home" && e.minute > start && e.minute <= end
    ).length;
    return { interval, value: goals * 3 + cards + (i < 3 ? 1 : Math.random() * 2 + 1), team: "home" };
  });

  const awayData = intervals.map((interval, i) => {
    const start = i * 15;
    const end = (i + 1) * 15;
    const goals = match.events.filter(
      (e) => e.type === "goal" && e.team === "away" && e.minute > start && e.minute <= end
    ).length;
    const cards = match.events.filter(
      (e) => (e.type === "yellow" || e.type === "red") && e.team === "away" && e.minute > start && e.minute <= end
    ).length;
    return { interval, value: goals * 3 + cards + (i < 3 ? 1 : Math.random() * 2 + 1), team: "away" };
  });

  const chartData = intervals.map((interval, i) => ({
    interval,
    home: Math.round(homeData[i].value * 10) / 10,
    away: Math.round(awayData[i].value * 10) / 10,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">{t('match.performance')}</h3>
      <p className="text-[10px] text-muted-foreground mb-3">{t('match.pressureIndex')}</p>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} barSize={12}>
            <XAxis
              dataKey="interval"
              tick={{ fontSize: 9, fill: "oklch(0.60 0.02 260)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "oklch(0.12 0.01 260)",
                border: "1px solid oklch(1 0 0 / 8%)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "oklch(0.95 0.01 260)",
              }}
              labelStyle={{ color: "oklch(0.60 0.02 260)", fontSize: "10px" }}
            />
            <Bar dataKey="home" radius={[4, 4, 0, 0]} name={match.homeTeam}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="oklch(0.72 0.22 155 / 70%)" />
              ))}
            </Bar>
            <Bar dataKey="away" radius={[4, 4, 0, 0]} name={match.awayTeam}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="oklch(0.55 0.15 260 / 70%)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-neon/70" />
          <span className="text-[10px] text-muted-foreground">{match.homeTeam}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "oklch(0.55 0.15 260 / 70%)" }} />
          <span className="text-[10px] text-muted-foreground">{match.awayTeam}</span>
        </div>
      </div>
    </motion.div>
  );
}
