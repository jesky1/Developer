import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      totalArticles,
      totalViews,
      aiGenerated,
      publishedCount,
      draftCount,
      articlesToday,
      recentArticles,
    ] = await Promise.all([
      db.newsItem.count(),
      db.newsItem.aggregate({ _sum: { viewCount: true } }),
      db.newsItem.count({ where: { isAiGenerated: true } }),
      db.newsItem.count({ where: { isPublished: true } }),
      db.newsItem.count({ where: { isPublished: false } }),
      db.newsItem.count({ where: { createdAt: { gte: todayStart } } }),
      db.newsItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          viewCount: true,
          isPublished: true,
          createdAt: true,
        },
      }),
    ])

    // Analytics: articles by day (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const recentArticlesAll = await db.newsItem.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, category: true, viewCount: true },
      orderBy: { createdAt: 'desc' },
    })

    // Group by day
    const articlesByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      articlesByDay[key] = 0
    }
    for (const a of recentArticlesAll) {
      const key = new Date(a.createdAt).toISOString().split('T')[0]
      if (key in articlesByDay) {
        articlesByDay[key]++
      }
    }

    // Category distribution
    const categoryDistribution: Record<string, number> = {}
    const allArticles = await db.newsItem.findMany({
      select: { category: true },
    })
    for (const a of allArticles) {
      categoryDistribution[a.category] = (categoryDistribution[a.category] || 0) + 1
    }

    // Top 5 articles
    const topArticles = await db.newsItem.findMany({
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        viewCount: true,
      },
    })

    // Generation status
    const lastAiArticle = await db.newsItem.findFirst({
      where: { isAiGenerated: true },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, title: true },
    })

    const settings = await db.siteSettings.findFirst()

    return NextResponse.json({
      totalArticles,
      totalViews: totalViews._sum.viewCount || 0,
      aiGenerated,
      publishedCount,
      draftCount,
      articlesToday,
      recentArticles: recentArticles.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      analytics: {
        articlesByDay: Object.entries(articlesByDay).map(([date, count]) => ({
          date,
          count,
        })),
        categoryDistribution: Object.entries(categoryDistribution).map(
          ([category, count]) => ({ category, count })
        ),
        topArticles,
      },
      autoPost: {
        enabled: settings?.autoPostEnabled ?? false,
        interval: settings?.autoPostInterval ?? 30,
        lastGeneration: lastAiArticle?.createdAt?.toISOString() ?? null,
        lastArticleTitle: lastAiArticle?.title ?? null,
        generatedToday: articlesToday,
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
