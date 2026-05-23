"use client";

import { useEffect, useRef } from "react";

/**
 * AdSenseLoader
 *
 * Client component that:
 * 1. Fetches the AdSense client ID from /api/ads/config
 * 2. Dynamically injects the Google AdSense script into <head>
 * 3. Dynamically injects the AMP auto-ads script into <head>
 * 4. Inserts the <amp-auto-ads> element right after <body>
 * 5. Avoids duplicate script injection
 *
 * All scripts are loaded client-side ONLY to prevent hydration mismatches
 * (third-party scripts modify the DOM before React hydrates).
 */
export function AdSenseLoader() {
    const injectedRef = useRef(false);

    useEffect(() => {
        if (injectedRef.current) return;

        async function loadAdSense() {
            try {
                const res = await fetch("/api/ads/config");
                if (!res.ok) return;

                const data = await res.json();
                const clientId = data.clientId;
                if (!clientId) return;

                // Avoid duplicate script tags
                const existingAdSense = document.querySelector(
                    'script[src*="pagead2.googlesyndication.com"]'
                );
                if (existingAdSense) {
                    injectedRef.current = true;
                    return;
                }

                // 1. Inject the Google AdSense script
                const adsenseScript = document.createElement("script");
                adsenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
                adsenseScript.async = true;
                adsenseScript.crossOrigin = "anonymous";
                document.head.appendChild(adsenseScript);

                // 2. Inject the AMP auto-ads script
                const existingAmp = document.querySelector(
                    'script[src*="cdn.ampproject.org/v0/amp-auto-ads"]'
                );
                if (!existingAmp) {
                    const ampScript = document.createElement("script");
                    ampScript.async = true;
                    ampScript.setAttribute("custom-element", "amp-auto-ads");
                    ampScript.src = "https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js";
                    document.head.appendChild(ampScript);
                }

                // 3. Insert <amp-auto-ads> element right after <body> opening tag
                const existingAmpAd = document.querySelector("amp-auto-ads");
                if (!existingAmpAd) {
                    const ampAdEl = document.createElement("amp-auto-ads");
                    ampAdEl.setAttribute("type", "adsense");
                    ampAdEl.setAttribute("data-ad-client", clientId);
                    document.body.insertBefore(ampAdEl, document.body.firstChild);
                }

                injectedRef.current = true;
            } catch {
                // Silently fail — AdSense is non-critical
            }
        }

        loadAdSense();
    }, []);

    return null;
}
