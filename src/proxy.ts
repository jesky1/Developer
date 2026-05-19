import { NextRequest, NextResponse } from "next/server";

// === i18n Proxy (Next.js 16 replaces "middleware" with "proxy") ===
// Handles locale detection from cookies and sets the NEXT_LOCALE cookie.
// URL-based routing (/id/..., /en/...) is handled client-side via the Language Selector.
// To enable URL-based routing in the future, restructure app/ with [lang] segments.

const COOKIE_NAME = "NEXT_LOCALE";
const locales = ["id", "en"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Check if locale cookie exists, if not set it from Accept-Language
  const existingLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (!existingLocale || !locales.includes(existingLocale)) {
    const acceptLanguage = request.headers.get("accept-language") || "";
    const prefersId = acceptLanguage.includes("id") || acceptLanguage.includes("id-ID");
    const defaultLocale = prefersId ? "id" : "en";

    response.cookies.set(COOKIE_NAME, defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except API, _next, and static files
    "/((?!api|_next|.*\\..*).*)",
  ],
};
