import { NextRequest, NextResponse } from "next/server";

// === i18n Proxy (Next.js 16 replaces "middleware" with "proxy") ===
// Handles locale detection and URL-based language routing.
// Supports both cookie-based persistence and URL prefix routing (/id/..., /en/...).

const COOKIE_NAME = "NEXT_LOCALE";
const locales = ["id", "en"];
const defaultLocale = "id"; // Default to Indonesian since this is an Indonesian project

// Paths that should be excluded from locale routing
const excludedPrefixes = [
  "/api/",
  "/_next/",
  "/admin",
];

function isExcluded(pathname: string): boolean {
  if (excludedPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;
  // Skip files with extensions (static assets)
  if (pathname.includes(".") && !pathname.startsWith("/id/") && !pathname.startsWith("/en/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for API routes, static files, Next.js internals
  if (isExcluded(pathname)) {
    return NextResponse.next();
  }

  // ─── URL-based locale routing ───
  // Check if the pathname has a locale prefix (e.g., /id/match/123, /en/match/123)
  const segments = pathname.split("/");
  const maybeLocale = segments[1]; // "id" or "en"

  if (maybeLocale && locales.includes(maybeLocale)) {
    // URL has a locale prefix — strip it and rewrite to the actual path
    const locale = maybeLocale;
    const restOfPath = segments.slice(2).join("/");
    const targetPath = restOfPath ? `/${restOfPath}` : "/";

    const url = request.nextUrl.clone();
    url.pathname = targetPath;

    const response = NextResponse.rewrite(url);

    // Set the locale cookie so it persists
    response.cookies.set(COOKIE_NAME, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    // Add custom header so the client knows the current locale
    response.headers.set("x-locale", locale);

    return response;
  }

  // ─── Cookie / Accept-Language detection ───
  const response = NextResponse.next();

  const existingLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (!existingLocale || !locales.includes(existingLocale)) {
    // Detect locale from Accept-Language header
    const acceptLanguage = request.headers.get("accept-language") || "";
    const prefersId = acceptLanguage.includes("id") || acceptLanguage.includes("id-ID");
    const detectedLocale = prefersId ? "id" : "en";

    response.cookies.set(COOKIE_NAME, detectedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    response.headers.set("x-locale", detectedLocale);
  } else {
    response.headers.set("x-locale", existingLocale);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except API, _next, and static files
    "/((?!api|_next|.*\\..*).*)",
  ],
};
