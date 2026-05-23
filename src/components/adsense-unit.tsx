"use client";

import { useEffect, useRef } from "react";

/**
 * AdSenseUnit
 *
 * Renders a Google AdSense ad unit with the specific slot ID.
 * The AdSense script is already loaded in <head> via layout.tsx,
 * so this component only needs the <ins> element and the push call.
 *
 * Props:
 * - adSlot: The Google AdSense slot ID (e.g., "3439860209")
 * - adClient: The publisher client ID (default: ca-pub-7385025232651253)
 * - adFormat: Ad format (default: "auto")
 * - fullWidthResponsive: Whether ad is full-width responsive (default: true)
 * - className: Optional wrapper className
 * - showLabel: Whether to show "Advertisement" label (default: true)
 */
interface AdSenseUnitProps {
    adSlot: string;
    adClient?: string;
    adFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
    fullWidthResponsive?: boolean;
    className?: string;
    showLabel?: boolean;
}

export function AdSenseUnit({
    adSlot,
    adClient = "ca-pub-7385025232651253",
    adFormat = "auto",
    fullWidthResponsive = true,
    className = "",
    showLabel = true,
}: AdSenseUnitProps) {
    const insRef = useRef<HTMLModElement>(null);
    const pushedRef = useRef(false);

    useEffect(() => {
        // Push the ad to AdSense only once per mount
        if (pushedRef.current) return;
        try {
            const w = window as Record<string, unknown>; // access adsbygoogle on window
            (w.adsbygoogle = w.adsbygoogle || []).push({});
            pushedRef.current = true;
        } catch {
            // AdSense not loaded yet — silently ignore
        }
    }, []);

    return (
        <div className={`ad-container w-full min-h-[90px] ${className}`}>
            {showLabel && (
                <div className="flex items-center justify-center mb-1">
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                        Advertisement
                    </span>
                </div>
            )}
            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
            />
        </div>
    );
}
