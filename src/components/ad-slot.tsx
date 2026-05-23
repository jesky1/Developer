"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ================================================================== */
/*  AD CONFIGURATION                                                  */
/* ================================================================== */

interface AdConfig {
    clientId: string;
    adUnits: Array<{
        id: string;
        name: string;
        slotId: string;
        placement: string;
        adType: string;
        isActive: boolean;
    }>;
}

let cachedConfig: AdConfig | null = null;
let configPromise: Promise<AdConfig | null> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAdConfig(): Promise<AdConfig | null> {
    // Return cached config if still fresh
    if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) return cachedConfig;
    if (configPromise) return configPromise;

    configPromise = (async () => {
        try {
            const res = await fetch("/api/ads/config");
            if (!res.ok) return null;
            const data = await res.json();
            cachedConfig = data;
            cacheTimestamp = Date.now();
            return data;
        } catch {
            return null;
        } finally {
            configPromise = null;
        }
    })();

    return configPromise;
}

/* ================================================================== */
/*  AD SLOT COMPONENT                                                 */
/* ================================================================== */

type AdFormat = "auto" | "horizontal" | "vertical" | "rectangle" | "in-feed" | "in-article";

interface AdSlotProps {
    /** Placement identifier — matches AdUnit.placement in DB (e.g. "header", "article_top") */
    placement: string;
    /** Visual format hint for the ad container */
    format?: AdFormat;
    /** Whether this ad is responsive (default: true) */
    responsive?: boolean;
    /** Optional className for the wrapper */
    className?: string;
    /** Show a subtle label "Advertisement" above the ad */
    showLabel?: boolean;
}

export function AdSlot({
    placement,
    format = "auto",
    responsive = true,
    className = "",
    showLabel = true,
}: AdSlotProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const pushedRef = useRef(false);
    const [config, setConfig] = useState<AdConfig | null>(null);
    const [adUnit, setAdUnit] = useState<AdConfig["adUnits"][number] | null>(null);

    // Fetch config on mount
    useEffect(() => {
        fetchAdConfig().then((cfg) => {
            if (cfg) {
                setConfig(cfg);
                const unit = cfg.adUnits.find(
                    (u) => u.placement === placement && u.isActive
                );
                setAdUnit(unit || null);
            }
        });
    }, [placement]);

    // Push ad once the ins element is in the DOM and config is ready
    const pushAd = useCallback(() => {
        if (pushedRef.current) return;
        if (!config?.clientId || !adUnit?.slotId) return;

        try {
            const adsbygoogle = (window as Record<string, unknown>)["adsbygoogle"] as Array<Record<string, unknown>> | undefined || [];
            adsbygoogle.push({});
            pushedRef.current = true;
        } catch {
            // AdSense not loaded yet — silently ignore
        }
    }, [config, adUnit]);

    useEffect(() => {
        if (adUnit && config?.clientId) {
            const timer = setTimeout(pushAd, 100);
            return () => clearTimeout(timer);
        }
    }, [adUnit, config, pushAd]);

    // No config or no matching ad unit → render invisible placeholder
    if (!config || !adUnit) {
        return (
            <div
                className={`flex items-center justify-center ${className}`}
                data-ad-placeholder={placement}
            />
        );
    }

    // Determine ad style based on format
    const formatStyle: Record<AdFormat, string> = {
        auto: "display:block",
        horizontal: "display:block",
        vertical: "display:block",
        rectangle: "display:inline-block;width:336px;height:280px",
        "in-feed": "display:block",
        "in-article": "display:block;text-align:center",
    };

    const containerClasses: Record<AdFormat, string> = {
        auto: "w-full min-h-[90px]",
        horizontal: "w-full min-h-[90px]",
        vertical: "w-[300px] min-h-[250px] mx-auto",
        rectangle: "w-[336px] h-[280px] mx-auto",
        "in-feed": "w-full min-h-[200px]",
        "in-article": "w-full min-h-[200px]",
    };

    return (
        <div
            className={`ad-container ${containerClasses[format]} ${className}`}
            data-ad-placement={placement}
        >
            {showLabel && (
                <div className="flex items-center justify-center mb-1">
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                        Advertisement
                    </span>
                </div>
            )}
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={formatStyle[format]}
                data-ad-client={config.clientId}
                data-ad-slot={adUnit.slotId}
                data-ad-format={
                    format === "auto"
                        ? "auto"
                        : format === "in-feed" || format === "in-article"
                            ? "fluid"
                            : "auto"
                }
                data-full-width-responsive={responsive ? "true" : "false"}
            />
        </div>
    );
}

/* ================================================================== */
/*  HOOK: useAdConfig                                                 */
/* ================================================================== */

export function useAdConfig() {
    const [config, setConfig] = useState<AdConfig | null>(null);

    useEffect(() => {
        fetchAdConfig().then((cfg) => {
            if (cfg) setConfig(cfg);
        });
    }, []);

    return config;
}
