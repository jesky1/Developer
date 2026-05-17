import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { I18nProvider } from "@/lib/i18n";

// JSON-LD structured data rendered server-side to avoid React 19 script-tag warnings
const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GOALZONE",
  url: "https://goalzone.app",
  description: "Real-time live football scores, standings, and match updates.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://goalzone.app/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const sportsDataLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: "Live Football Matches",
  description: "Live football match scores and updates from top leagues worldwide",
  sport: "Football",
  organizer: { "@type": "Organization", name: "GOALZONE" },
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
  metadataBase: new URL("https://goalzone.app"),
  title: {
    default: "GOALZONE - Live Football Scores, Standings & Real-Time Updates",
    template: "%s | GOALZONE",
  },
  description:
    "Real-time live football scores, standings, top scorers, and match updates. Your premium football dashboard for Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and more.",
  keywords: [
    "football",
    "live scores",
    "soccer",
    "goalzone",
    "match updates",
    "premier league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "standings",
    "top scorers",
    "live football",
    "football results",
    "soccer scores",
    "match highlights",
    "football stats",
  ],
  authors: [{ name: "GOALZONE", url: "https://goalzone.app" }],
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
    url: "https://goalzone.app",
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
  icons: {
    icon: "/goalzone-logo.png",
    apple: "/goalzone-logo.png",
  },
  category: "sports",
  classification: "Sports & Entertainment",
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
        <link rel="alternate" type="application/rss+xml" title="GOALZONE Football News RSS" href="https://goalzone.app/api/news/rss" />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="https://goalzone.app/api/sitemap" />
        {/* JSON-LD structured data — rendered server-side in <head> to avoid React script-tag warnings */}
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
