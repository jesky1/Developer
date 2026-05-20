import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

async function getDb() {
  // Dynamic import to ensure dotenv is loaded first
  const { db } = await import('@/lib/db')
  return db
}

export async function GET() {
  try {
    const db = await getDb()

    const [news, matches] = await Promise.all([
      db.newsItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { slug: true, id: true, updatedAt: true },
      }).catch(() => []),
      db.match.findMany({
        select: { id: true, updatedAt: true },
      }).catch(() => []),
    ])

    const baseUrl = 'https://goalzone-live.vercel.app'
    const now = new Date().toISOString()

    const newsUrls = news.map((article) => {
      const slug = article.slug || article.id
      let lastmod = now
      try { lastmod = new Date(article.updatedAt).toISOString() } catch { /* use default */ }
      return `  <url>
    <loc>${baseUrl}/news/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    }).join('\n')

    const matchUrls = matches.map((match) => {
      let lastmod = now
      try { lastmod = new Date(match.updatedAt).toISOString() } catch { /* use default */ }
      return `  <url>
    <loc>${baseUrl}/match/${match.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`
    }).join('\n')

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/api/news/rss</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.5</priority>
  </url>
${matchUrls}
${newsUrls}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return minimal sitemap on error so crawlers don't get 500
    const baseUrl = 'https://goalzone-live.vercel.app'
    const now = new Date().toISOString()
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
    return new NextResponse(fallback, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  }
}
