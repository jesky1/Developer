/**
 * Structured Data Component (Server Component)
 *
 * Renders JSON-LD structured data for SEO using React's dangerouslySetInnerHTML
 * with <script type="application/ld+json"> tags. This is a Server Component
 * so the tags are rendered directly into the HTML response for crawlers.
 *
 * Separated from layout.tsx to avoid React 19 script-tag-in-component warnings
 * when using the Next.js <Script> component.
 */

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GOALZONE",
  url: "https://goalzone.app",
  description:
    "Real-time live football scores, standings, and match updates.",
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
  description:
    "Live football match scores and updates from top leagues worldwide",
  sport: "Football",
  organizer: {
    "@type": "Organization",
    name: "GOALZONE",
  },
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsDataLd) }}
      />
    </>
  );
}
