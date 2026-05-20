import { NextRequest, NextResponse } from 'next/server'
import { safeNewsFindMany } from '@/lib/safe-query'

export const dynamic = 'force-dynamic'

// Football-themed fallback images from Unsplash (free, no API key needed)
const FOOTBALL_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80',
]

function getFallbackImage(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  const index = Math.abs(hash) % FOOTBALL_FALLBACK_IMAGES.length
  return FOOTBALL_FALLBACK_IMAGES[index]
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const news = await safeNewsFindMany(db, {
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const parsed = news.map((n: any) => {
      let tags: string[] = []
      try { tags = JSON.parse(n.tags) } catch { tags = [] }

      const imageUrl = n.imageUrl || getFallbackImage(n.title)

      return {
        id: n.id,
        title: n.title,
        slug: n.slug,
        summary: n.summary,
        content: n.content,
        category: n.category,
        imageUrl,
        imageAlt: n.imageAlt || '',
        source: n.source,
        tags,
        seoTitle: n.seoTitle,
        seoDescription: n.seoDescription,
        league: n.league,
        matchId: n.matchId,
        isAiGenerated: n.isAiGenerated,
        publishedAt: n.publishedAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }
    })

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json([])
  }
}
