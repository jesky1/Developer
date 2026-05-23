"use client";

import { useEffect, useState } from "react";

/**
 * AdSenseLoader
 *
 * Client component that:
 * 1. Fetches the AdSense client ID from /api/ads/config
 * 2. Dynamically injects the Google AdSense script into <head>
 * 3. Avoids duplicate script injection
 *
 * Rendered once in the root layout. Returns null (invisible).
 */
export function AdSenseLoader() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (loaded) return;

        async function loadAdSense() {
            try {
                const res = await fetch("/api/ads/config");
                if (!res.ok) return;

                const data = await res.json();
                const clientId = data.clientId;

                if (!clientId) return;

                // Avoid duplicate script tags
                const existing = document.querySelector(
                    'script[src*="pagead2.googlesyndication.com"]'
                );
                if (existing) {
                    setLoaded(true);
                    return;
                }

                // Inject the AdSense script
                const script = document.createElement("script");
                script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
                script.async = true;
                script.crossOrigin = "anonymous";
                document.head.appendChild(script);

                setLoaded(true);
            } catch {
                // Silently fail — AdSense is non-critical
            }
        }

        loadAdSense();
    }, [loaded]);

    return null;
}
