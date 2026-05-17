import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const news = await db.newsItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const baseUrl = 'https://goalzone.app'

    const items = news.map((article) => {
      const slug = article.slug || article.id
      const pubDate = new Date(article.createdAt).toUTCString()
      let tags: string[] = []
      try { tags = JSON.parse(article.tags) as string[] } catch { tags = [] }

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${baseUrl}/news/${slug}</link>
      <guid isPermaLink="true">${baseUrl}/news/${slug}</guid>
      <description><![CDATA[${article.summary}]]></description>
      <pubDate>${pubDate}</pubDate>
      <source>${article.source}</source>
      <category>${article.category}</category>
      ${article.league ? `<category>${article.league}</category>` : ''}
      ${tags.map((t) => `<category>${t}</category>`).join('\n      ')}
    </item>`
    }).join('\n')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GOALZONE - Latest Football News</title>
    <link>${baseUrl}</link>
    <description>Real-time football news, match reports, transfer updates, and analysis powered by AI</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/news/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
  }
}
