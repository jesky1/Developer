import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // revalidate every hour

export async function GET() {
  const baseUrl = 'https://goalzone-live.vercel.app'
  const now = new Date().toISOString()

  // Static pages that always exist
  const staticUrls = `
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
  </url>`

  let dynamicUrls = ''

  try {
    // Dynamic import to handle Prisma initialization gracefully
    const { db } = await import('@/lib/db')

    const [news, matches] = await Promise.all([
      db.newsItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { slug: true, id: true, updatedAt: true },
      }),
      db.match.findMany({
        select: { id: true, updatedAt: true },
      }),
    ])

    const newsUrls = news.map((article) => {
      const slug = article.slug || article.id
      const lastmod = article.updatedAt?.toISOString() || now
      return `  <url>
    <loc>${baseUrl}/news/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    }).join('\n')

    const matchUrls = matches.map((match) => {
      const lastmod = match.updatedAt?.toISOString() || now
      return `  <url>
    <loc>${baseUrl}/match/${match.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`
    }).join('\n')

    dynamicUrls = `\n${matchUrls}\n${newsUrls}`
  } catch (error) {
    // If Prisma fails, still return a valid sitemap with static URLs
    console.error('Error generating dynamic sitemap URLs:', error)
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}${dynamicUrls}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
