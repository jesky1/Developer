"use client";

import { useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// View Transitions API - use the built-in DOM types from TypeScript 5.x

type VTUpdateCallback = () => void | Promise<void>;

const SPLASH_SESSION_KEY = "goalzone-splash-shown";
const SCROLL_POSITION_KEY = "goalzone-scroll-pos";

/**
 * Save current scroll position to sessionStorage
 */
function saveScrollPosition(path: string) {
  try {
    const key = `${SCROLL_POSITION_KEY}:${path}`;
    sessionStorage.setItem(key, JSON.stringify({ x: window.scrollX, y: window.scrollY }));
  } catch {
    // sessionStorage may be unavailable
  }
}

/**
 * Restore scroll position from sessionStorage
 */
function restoreScrollPosition(path: string) {
  try {
    const key = `${SCROLL_POSITION_KEY}:${path}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const { x, y } = JSON.parse(saved);
      // Use requestAnimationFrame to ensure DOM is painted before scrolling
      requestAnimationFrame(() => {
        window.scrollTo(x, y);
      });
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage may be unavailable
  }
}

/**
 * Check if splash screen has been shown this session
 */
export function hasSplashBeenShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark splash screen as shown for this session
 */
export function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
  } catch {
    // sessionStorage may be unavailable
  }
}

/**
 * Navigation hook with View Transitions API and smart history management.
 * 
 * - Uses router.replace() for hash changes on the same page (no history stacking)
 * - Uses router.push() for cross-page navigation
 * - Wraps navigation with View Transitions API when available
 * - Saves/restores scroll positions for back navigation
 */
export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigatingRef = useRef(false);

  /**
   * Navigate with View Transition support
   * @param href - Target URL
   * @param options - Navigation options
   */
  const navigate = useCallback(
    (href: string, options?: { replace?: boolean; scroll?: boolean }) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      const replace = options?.replace ?? false;
      const shouldScroll = options?.scroll ?? true;

      // Determine if this is a same-page hash navigation
      const isSamePageHash = href.startsWith("#") ||
        (href.startsWith(pathname) && href.includes("#"));

      const shouldReplace = replace || isSamePageHash;

      // Save current scroll position before navigating
      saveScrollPosition(pathname);

      // If it's just a hash on the same page, use native scroll + replace
      if (href.startsWith("#")) {
        const target = document.getElementById(href.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // Replace URL hash without adding history entry
        router.replace(href, { scroll: false });
        isNavigatingRef.current = false;
        return;
      }

      // Use View Transitions API if available
      const startTransition = document.startViewTransition;

      const doNavigate = () => {
        if (shouldReplace) {
          router.replace(href, { scroll: shouldScroll });
        } else {
          router.push(href, { scroll: shouldScroll });
        }
        // Reset navigating flag after a tick
        requestAnimationFrame(() => {
          isNavigatingRef.current = false;
        });
      };

      if (startTransition) {
        try {
          startTransition(doNavigate);
        } catch {
          doNavigate();
        }
      } else {
        doNavigate();
      }
    },
    [router, pathname]
  );

  /**
   * Go back with View Transition support
   */
  const goBack = useCallback(() => {
    saveScrollPosition(pathname);

    const startTransition = document.startViewTransition;

    const doBack = () => {
      router.back();
    };

    if (startTransition) {
      try {
        startTransition(doBack);
      } catch {
        doBack();
      }
    } else {
      doBack();
    }
  }, [router, pathname]);

  /**
   * Go home with View Transition support
   */
  const goHome = useCallback(() => {
    saveScrollPosition(pathname);
    navigate("/", { replace: false });
  }, [navigate, pathname]);

  /**
   * Restore scroll position for the current path
   */
  const restoreScroll = useCallback(() => {
    restoreScrollPosition(pathname);
  }, [pathname]);

  return {
    navigate,
    goBack,
    goHome,
    restoreScroll,
    pathname,
  };
}
