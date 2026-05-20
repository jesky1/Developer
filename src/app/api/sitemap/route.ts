import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const news = await db.newsItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const matches = await db.match.findMany()

    const baseUrl = 'https://goalzone.app'
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
    return NextResponse.json(
      { error: 'Failed to generate sitemap' },
      { status: 500 }
    )
  }
}
