"use client";

import { useState, useCallback } from "react";

/**
 * ClubLogo — Reusable component for displaying club/team/league/player logos
 * with automatic fallback when image fails to load.
 *
 * Fallback chain:
 * 1. Show the image from `src` if provided
 * 2. On error (404, broken URL, etc.) → show initials in a styled circle
 * 3. If no `src` provided → show initials directly
 *
 * No broken images, no empty boxes — ever.
 */

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
type LogoVariant = "circle" | "square";

interface ClubLogoProps {
  name: string;
  src?: string;
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  style?: React.CSSProperties;
}

const sizeClasses: Record<LogoSize, { outer: string; text: string; img: string }> = {
  xs: { outer: "w-4 h-4", text: "text-[6px]", img: "w-3 h-3" },
  sm: { outer: "w-6 h-6", text: "text-[10px]", img: "w-5 h-5" },
  md: { outer: "w-8 h-8", text: "text-xs", img: "w-7 h-7" },
  lg: { outer: "w-12 h-12 sm:w-14 sm:h-14", text: "text-lg sm:text-xl", img: "w-9 h-9 sm:w-11 sm:h-11" },
  xl: { outer: "w-14 h-14 sm:w-16 sm:h-16", text: "text-xl sm:text-2xl", img: "w-10 h-10 sm:w-12 sm:h-12" },
};

const variantClasses: Record<LogoVariant, string> = {
  circle: "rounded-full",
  square: "rounded-xl",
};

/** Extract 1-2 character initials from a name */
function getInitials(name: string): string {
  if (!name) return "?";

  // Remove common club prefixes for cleaner initials
  const cleaned = name
    .replace(/^(FC|SC|CF|CA|AS|SS|US|AC|AJ|FK|BK|SK|1\.\s|1\.FC\s)/i, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return name.charAt(0).toUpperCase();
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  // Take first letter of first word + first letter of last word
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function ClubLogo({
  name,
  src,
  size = "md",
  variant = "circle",
  className = "",
  style,
}: ClubLogoProps) {
  const [imgError, setImgError] = useState(false);

  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  const s = sizeClasses[size];
  const v = variantClasses[variant];
  const initials = getInitials(name);

  // No src or image failed → show initials
  if (!src || imgError) {
    return (
      <div
        className={`
          ${s.outer} ${v} flex items-center justify-center shrink-0
          bg-surface-light border border-white/10
          ${s.text} font-bold text-foreground/70
          ${className}
        `}
        style={style}
        title={name}
        aria-label={`${name} logo`}
      >
        {initials}
      </div>
    );
  }

  // Image available
  return (
    <div
      className={`
        ${s.outer} ${v} flex items-center justify-center shrink-0
        bg-surface-light border border-white/10 overflow-hidden
        ${className}
      `}
      style={style}
      title={name}
      aria-label={`${name} logo`}
    >
      <img
        src={src}
        alt={`${name} logo`}
        className={`${s.img} object-contain`}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Convenience wrapper for league logos (always square, smaller)
 */
export function LeagueLogo({
  name,
  src,
  size = "xs",
  className = "",
  style,
}: {
  name: string;
  src?: string;
  size?: LogoSize;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <ClubLogo
      name={name}
      src={src}
      size={size}
      variant="square"
      className={className}
      style={style}
    />
  );
}
