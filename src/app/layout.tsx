import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { I18nProvider } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://goalzone-live.vercel.app";

// JSON-LD structured data — Organization schema for Google Knowledge Panel
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GOALZONE",
  url: SITE_URL,
  logo: `${SITE_URL}/goalzone-logo.png`,
  description: "Real-time live football scores, standings, and match updates from top leagues worldwide.",
  sameAs: [
    "https://twitter.com/goalzone",
    "https://facebook.com/goalzone",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/contact`,
  },
};

// WebSite schema with SearchAction for Google Sitelinks Search Box
const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GOALZONE",
  url: SITE_URL,
  description: "Real-time live football scores, standings, and match updates.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// SportsEvent schema for live matches
const sportsDataLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: "Live Football Matches",
  description: "Live football match scores and updates from top leagues worldwide",
  sport: "Football",
  organizer: {
    "@type": "Organization",
    name: "GOALZONE",
    url: SITE_URL,
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GOALZONE - Live Football Scores, Standings & Real-Time Updates",
    template: "%s | GOALZONE",
  },
  description:
    "Real-time live football scores, standings, top scorers, and match updates. Your premium football dashboard for Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and more.",
  keywords: [
    "live football scores",
    "live soccer scores",
    "goalzone",
    "football results",
    "soccer results",
    "premier league scores",
    "la liga standings",
    "serie a results",
    "bundesliga scores",
    "ligue 1 table",
    "champions league",
    "europa league",
    "match highlights",
    "football stats",
    "top scorers",
    "football standings",
    "live match updates",
    "skor bola live",
    "hasil pertandingan",
    "klasemen liga",
  ],
  authors: [{ name: "GOALZONE", url: SITE_URL }],
  creator: "GOALZONE",
  publisher: "GOALZONE",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "GOALZONE",
    title: "GOALZONE - Live Football Scores, Standings & Real-Time Updates",
    description:
      "Real-time live football scores, standings, top scorers, and match updates. Your premium football dashboard.",
    images: [
      {
        url: "/goalzone-logo.png",
        width: 1024,
        height: 1024,
        alt: "GOALZONE - Live Football Scores",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GOALZONE - Live Football Scores",
    description:
      "Real-time live football scores, standings, and match updates. Your premium football dashboard.",
    images: ["/goalzone-logo.png"],
    creator: "@goalzone",
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/goalzone-logo.png",
    apple: "/goalzone-logo.png",
  },
  category: "sports",
  classification: "Sports & Entertainment",
  verification: {
    google: "google82271afd81b42e09",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5faf5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="view-transition" content="same-origin" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title="GOALZONE Football News RSS" href={`${SITE_URL}/api/news/rss`} />

        {/* JSON-LD structured data — rendered server-side in <head> */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsDataLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <I18nProvider>
              {children}
            </I18nProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "toast-theme-aware",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
