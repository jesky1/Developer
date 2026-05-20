import { NextRequest, NextResponse } from 'next/server'
import { safeNewsFindMany, safeNewsCount } from '@/lib/safe-query'

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    let articles: any[]

    try {
      articles = await db.newsItem.findMany({
        where: {
          isPublished: true,
          viewCount: { gt: 0 },
        },
        orderBy: { viewCount: 'desc' },
        take: Math.min(limit, 50),
      })
    } catch (error: any) {
      // P2022 = column not synced yet
      if (error?.code === 'P2022') {
        console.warn('⚠️ NewsItem schema not fully synced for trending, using safe query')
        articles = await safeNewsFindMany(db, {
          orderBy: { createdAt: 'desc' },
          take: Math.min(limit, 50),
        })
      } else {
        throw error
      }
    }

    const parsed = articles.map((n: any) => {
      let tags: string[] = []
      try { tags = JSON.parse(n.tags) } catch { tags = [] }

      let seoKeywords: string[] = []
      try { seoKeywords = JSON.parse(n.seoKeywords) } catch { seoKeywords = [] }

      return {
        id: n.id,
        title: n.title,
        slug: n.slug,
        summary: n.summary,
        content: n.content,
        category: n.category,
        imageUrl: n.imageUrl,
        imageAlt: n.imageAlt || '',
        imageWidth: n.imageWidth || 0,
        imageHeight: n.imageHeight || 0,
        imageSource: n.imageSource || '',
        source: n.source,
        sourceUrl: n.sourceUrl || '',
        tags,
        seoTitle: n.seoTitle,
        seoDescription: n.seoDescription,
        seoKeywords,
        league: n.league,
        matchId: n.matchId,
        isAiGenerated: n.isAiGenerated,
        isHeadline: n.isHeadline || false,
        isPublished: n.isPublished ?? true,
        language: n.language || 'id',
        viewCount: n.viewCount || 0,
        publishedAt: n.publishedAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }
    })

    return NextResponse.json({
      articles: parsed,
      limit,
    })
  } catch (error) {
    console.error('Error fetching trending news:', error)
    return NextResponse.json({ articles: [], limit: 10 })
  }
}
