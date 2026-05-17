"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface SplashScreenProps {
  onFinished: () => void;
}

// Deterministic pseudo-random number generator seeded by index
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Pre-compute particle configs using deterministic values
function getParticleConfig(index: number) {
  const seed = index + 1;
  return {
    x: `${seededRandom(seed * 1.1) * 100}%`,
    y: `${seededRandom(seed * 2.3) * 100}%`,
    duration: 2 + seededRandom(seed * 3.7) * 2,
    delay: seededRandom(seed * 4.1) * 1.5,
    repeatDelay: seededRandom(seed * 5.9) * 2,
  };
}

const PARTICLE_COUNT = 20;

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  // Stable callback ref to avoid re-triggering effect
  const onFinishedRef = useCallback(() => onFinished(), [onFinished]);

  // Pre-compute all particle configs deterministically
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => getParticleConfig(i));
  }, []);

  useEffect(() => {
    // Phase timing
    const enterTimer = setTimeout(() => setPhase("hold"), 400);
    const holdTimer = setTimeout(() => setPhase("exit"), 2200);
    const finishTimer = setTimeout(() => onFinishedRef(), 2900);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinishedRef]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      style={{ pointerEvents: phase === "exit" ? "none" : "auto" }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            initial={{
              x: p.x,
              y: p.y,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              repeatDelay: p.repeatDelay,
            }}
            className="absolute w-1 h-1 rounded-full bg-neon"
          />
        ))}
      </div>

      {/* Radial glow behind logo */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: phase === "enter" ? [0, 1.5] : phase === "hold" ? [1.5, 2] : [2, 0],
          opacity: phase === "enter" ? [0, 0.4] : phase === "hold" ? [0.4, 0.3] : [0.3, 0],
        }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute w-64 h-64 rounded-full bg-neon/20 blur-3xl"
      />

      <div className="flex flex-col items-center gap-6">
        {/* Logo icon with animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: phase === "enter" ? [0, 1.2, 1] : 1,
            rotate: phase === "enter" ? [-180, 0] : 0,
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative"
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center neon-glow-strong">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-neon" />
            {/* Pulse ring */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-2xl border-2 border-neon/40"
            />
          </div>
        </motion.div>

        {/* Brand text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "enter" ? [0, 1] : phase === "hold" ? 1 : [1, 0],
            y: phase === "enter" ? [20, 0] : 0,
          }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest">
            <span className="text-foreground">GOAL</span>
            <span className="text-neon neon-text">ZONE</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-xs sm:text-sm text-muted-foreground tracking-[0.3em] uppercase"
          >
            {t('splash.subtitle')}
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="w-48 sm:w-56 h-1 rounded-full bg-surface-light overflow-hidden mt-2"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.5,
              delay: 0.6,
              ease: "easeInOut",
            }}
            className="h-full w-full bg-gradient-to-r from-transparent via-neon to-transparent rounded-full"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
