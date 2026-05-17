import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const articles = await db.newsItem.findMany({
      where: {
        isPublished: true,
        viewCount: { gt: 0 },
      },
      orderBy: { viewCount: 'desc' },
      take: Math.min(limit, 50), // Cap at 50 max
    })

    const parsed = articles.map((n) => {
      // Parse tags JSON string
      let tags: string[] = []
      try {
        tags = JSON.parse(n.tags)
      } catch {
        tags = []
      }

      // Parse seoKeywords JSON string
      let seoKeywords: string[] = []
      try {
        seoKeywords = JSON.parse(n.seoKeywords)
      } catch {
        seoKeywords = []
      }

      return {
        id: n.id,
        title: n.title,
        slug: n.slug,
        summary: n.summary,
        content: n.content,
        category: n.category,
        imageUrl: n.imageUrl,
        imageAlt: n.imageAlt,
        imageWidth: n.imageWidth,
        imageHeight: n.imageHeight,
        imageSource: n.imageSource,
        source: n.source,
        sourceUrl: n.sourceUrl,
        tags,
        seoTitle: n.seoTitle,
        seoDescription: n.seoDescription,
        seoKeywords,
        league: n.league,
        matchId: n.matchId,
        isAiGenerated: n.isAiGenerated,
        isHeadline: n.isHeadline,
        isPublished: n.isPublished,
        language: n.language,
        viewCount: n.viewCount,
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
    return NextResponse.json(
      { error: 'Failed to fetch trending news' },
      { status: 500 }
    )
  }
}
