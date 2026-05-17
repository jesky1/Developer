"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Ad format types supported by AdSense
type AdFormat =
    | "auto"
    | "horizontal"
    | "vertical"
    | "rectangle"
    | "leaderboard"
    | "banner"
    | "skyscraper"
    | "mobile-banner";

interface AdSenseAdProps {
    /** Ad slot ID from Google AdSense (e.g., "1234567890") */
    adSlot: string;
    /** Ad format — controls the shape and size */
    adFormat?: AdFormat;
    /** Whether this is a full-width responsive ad */
    fullWidthResponsive?: boolean;
    /** Custom CSS class */
    className?: string;
    /** Optional label text shown above the ad */
    label?: string;
    /** Minimum height for the ad container (prevents layout shift) */
    minHeight?: number;
}

/**
 * AdSenseAd — Reusable Google AdSense ad unit component.
 *
 * Usage:
 *   <AdSenseAd adSlot="1234567890" adFormat="horizontal" />
 *   <AdSenseAd adSlot="0987654321" adFormat="rectangle" fullWidthResponsive />
 *
 * Requirements:
 *   - NEXT_PUBLIC_ADSENSE_CLIENT_ID must be set in .env
 *   - The AdSense auto-ads script is already loaded in layout.tsx
 */
export function AdSenseAd({
    adSlot,
    adFormat = "auto",
    fullWidthResponsive = true,
    className,
    label = "Advertisement",
    minHeight,
}: AdSenseAdProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const isAdPushed = useRef(false);

    useEffect(() => {
        // Only push ad if AdSense is loaded and we haven't already pushed this ad
        if (!adSlot || isAdPushed.current) return;

        try {
            // Check if adsbygoogle array exists (AdSense script loaded)
            const adsbygoogle = (window as Record<string, unknown[] | undefined>).adsbygoogle;
            if (adsbygoogle) {
                adsbygoogle.push({});
                isAdPushed.current = true;
            }
        } catch (e) {
            console.warn("AdSense push error:", e);
        }
    }, [adSlot]);

    // Don't render if no client ID is configured
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    if (!clientId) return null;

    // Size mappings based on format
    const formatStyles: Record<AdFormat, string> = {
        auto: "w-full",
        horizontal: "w-full max-w-[728px]",
        vertical: "w-[160px] min-h-[600px]",
        rectangle: "w-[336px] min-h-[280px]",
        leaderboard: "w-full max-w-[728px] min-h-[90px]",
        banner: "w-full max-w-[468px] min-h-[60px]",
        skyscraper: "w-[160px] min-h-[600px]",
        "mobile-banner": "w-full max-w-[320px] min-h-[50px]",
    };

    return (
        <div
            className={cn(
                "ad-container mx-auto my-4",
                className
            )}
            style={minHeight ? { minHeight } : undefined}
        >
            {/* Ad label — required by AdSense policies */}
            {label && (
                <div className="text-center mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
                        {label}
                    </span>
                </div>
            )}

            {/* Ad unit */}
            <div className={cn("flex justify-center", formatStyles[adFormat])} ref={adRef}>
                <ins
                    className="adsbygoogle"
                    style={{ display: "block" }}
                    data-ad-client={clientId}
                    data-ad-slot={adSlot}
                    data-ad-format={adFormat}
                    data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
                />
            </div>
        </div>
    );
}

/**
 * AdSenseBanner — Pre-configured horizontal banner ad for top-of-page placement
 */
export function AdSenseBanner({ className }: { className?: string }) {
    return (
        <AdSenseAd
            adSlot="top-banner"
            adFormat="horizontal"
            fullWidthResponsive
            className={className}
            label="Advertisement"
            minHeight={90}
        />
    );
}

/**
 * AdSenseInFeed — In-feed ad that blends between content sections
 */
export function AdSenseInFeed({ className }: { className?: string }) {
    return (
        <AdSenseAd
            adSlot="in-feed"
            adFormat="fluid"
            fullWidthResponsive
            className={className}
            label=""
            minHeight={120}
        />
    );
}

/**
 * AdSenseSidebar — Vertical/sidebar ad for right column
 */
export function AdSenseSidebar({ className }: { className?: string }) {
    return (
        <AdSenseAd
            adSlot="sidebar"
            adFormat="rectangle"
            fullWidthResponsive
            className={className}
            label="Advertisement"
            minHeight={250}
        />
    );
}

/**
 * AdSenseFooter — Leaderboard ad at the bottom of the page
 */
export function AdSenseFooter({ className }: { className?: string }) {
    return (
        <AdSenseAd
            adSlot="footer-leaderboard"
            adFormat="leaderboard"
            fullWidthResponsive
            className={className}
            label="Advertisement"
            minHeight={90}
        />
    );
}
