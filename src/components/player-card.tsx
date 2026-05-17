"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  name: string;
  number: number;
  position: string;
  rating?: number;
  photoUrl?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  delay?: number;
  highlight?: boolean;
}

function getPositionColor(position: string) {
  const pos = position.toUpperCase();
  if (pos === "GK") return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", ring: "ring-yellow-400/40" };
  if (["DF", "CB", "LB", "RB", "LWB", "RWB"].includes(pos) || pos.includes("B"))
    return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", ring: "ring-blue-400/40" };
  if (["MF", "CM", "CDM", "CAM", "LM", "RM", "AM"].includes(pos))
    return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", ring: "ring-green-400/40" };
  return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", ring: "ring-red-400/40" };
}

function getPositionCategory(position: string): "GK" | "DF" | "MF" | "FW" {
  const pos = position.toUpperCase();
  if (pos === "GK") return "GK";
  if (["DF", "CB", "LB", "RB", "LWB", "RWB"].includes(pos) || pos.includes("B")) return "DF";
  if (["MF", "CM", "CDM", "CAM", "LM", "RM", "AM"].includes(pos)) return "MF";
  return "FW";
}

function getRatingColor(rating: number) {
  if (rating >= 8.0) return "bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]";
  if (rating >= 7.0) return "bg-lime-500 text-black";
  if (rating >= 6.0) return "bg-yellow-500 text-black";
  return "bg-red-500 text-white";
}

export function PlayerCard({
  name,
  number,
  position,
  rating = 0,
  photoUrl,
  onClick,
  size = "md",
  delay = 0,
  highlight = false,
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const handleImgError = useCallback(() => setImgError(true), []);

  const posColor = getPositionColor(position);
  const posCategory = getPositionCategory(position);

  const hasValidPhoto = photoUrl && !imgError;

  const sizeMap = {
    sm: { card: "w-16", avatar: "w-8 h-8", text: "text-[8px]", num: "text-[9px]", badge: "text-[7px] px-1" },
    md: { card: "w-20 sm:w-24", avatar: "w-10 h-10 sm:w-12 sm:h-12", text: "text-[9px] sm:text-[10px]", num: "text-[10px] sm:text-xs", badge: "text-[8px] px-1.5" },
    lg: { card: "w-24 sm:w-28", avatar: "w-14 h-14 sm:w-16 sm:h-16", text: "text-[10px] sm:text-xs", num: "text-xs sm:text-sm", badge: "text-[9px] px-2" },
  };

  const s = sizeMap[size];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, type: "spring", stiffness: 180, damping: 14 }}
      whileHover={{ scale: 1.08, y: -3 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 cursor-pointer group ${s.card}`}
      aria-label={`${name}, #${number}, ${position}`}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={`
            ${s.avatar} rounded-full border-2 flex items-center justify-center
            transition-all duration-200 overflow-hidden
            ${posColor.bg} ${posColor.border}
            group-hover:shadow-[0_0_12px_rgba(74,222,128,0.4)]
            ${highlight ? `ring-2 ${posColor.ring} shadow-[0_0_10px_rgba(74,222,128,0.3)]` : ""}
          `}
        >
          {hasValidPhoto ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" onError={handleImgError} />
          ) : (
            <span className={`${s.num} font-bold ${posColor.text}`}>
              {number}
            </span>
          )}
        </div>

        {/* Rating badge */}
        {rating > 0 && (
          <span
            className={`
              absolute -top-1 -right-1 min-w-[18px] h-[18px] sm:min-w-[22px] sm:h-[22px]
              rounded-full flex items-center justify-center
              text-[8px] sm:text-[10px] font-bold leading-none
              ${getRatingColor(rating)}
            `}
          >
            {rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Name */}
      <span className={`${s.text} font-semibold text-foreground/90 leading-tight max-w-full truncate text-center`}>
        {name.split(" ").pop() || name}
      </span>

      {/* Position badge */}
      <Badge
        variant="outline"
        className={`${s.badge} py-0 font-semibold ${posColor.bg} ${posColor.text} ${posColor.border}`}
      >
        {posCategory}
      </Badge>
    </motion.button>
  );
}
