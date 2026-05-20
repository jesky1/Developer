/**
 * Safe query wrapper for NewsItem that handles P2022 (column does not exist) errors.
 * This prevents crashes when the database schema hasn't been fully synced yet
 * (e.g., during Vercel deployment before prisma db push completes).
 *
 * Usage:
 *   const news = await safeNewsQuery(db, { orderBy: { createdAt: 'desc' }, take: 10 })
 */

// Core columns that exist in ALL versions of the NewsItem table
const CORE_NEWS_SELECT = {
    id: true,
    title: true,
    slug: true,
    summary: true,
    content: true,
    category: true,
    imageUrl: true,
    source: true,
    tags: true,
    seoTitle: true,
    seoDescription: true,
    league: true,
    matchId: true,
    isAiGenerated: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
}

// Extended columns that may not exist yet (added after initial deployment)
const EXTENDED_NEWS_SELECT = {
    ...CORE_NEWS_SELECT,
    imageAlt: true,
    imageWidth: true,
    imageHeight: true,
    imageSource: true,
    sourceUrl: true,
    seoKeywords: true,
    keywords: true,
    isPublished: true,
    isHeadline: true,
    language: true,
    viewCount: true,
}

type DbClient = { newsItem: { findMany: (args: any) => Promise<any[]>; findFirst: (args: any) => Promise<any | null>; findUnique: (args: any) => Promise<any | null>; count: (args?: any) => Promise<number> } }

export async function safeNewsFindMany(db: DbClient, args: Record<string, any> = {}) {
    try {
        return await db.newsItem.findMany({ ...args, select: EXTENDED_NEWS_SELECT })
    } catch (error: any) {
        if (error?.code === 'P2022') {
            console.warn('⚠️ NewsItem schema not fully synced, using core columns only')
            const { select, ...rest } = args
            return await db.newsItem.findMany({ ...rest, select: CORE_NEWS_SELECT })
        }
        throw error
    }
}

export async function safeNewsFindFirst(db: DbClient, args: Record<string, any> = {}) {
    try {
        return await db.newsItem.findFirst({ ...args, select: EXTENDED_NEWS_SELECT })
    } catch (error: any) {
        if (error?.code === 'P2022') {
            console.warn('⚠️ NewsItem schema not fully synced, using core columns only')
            const { select, ...rest } = args
            return await db.newsItem.findFirst({ ...rest, select: CORE_NEWS_SELECT })
        }
        throw error
    }
}

export async function safeNewsFindUnique(db: DbClient, args: Record<string, any>) {
    try {
        return await db.newsItem.findUnique({ ...args, select: EXTENDED_NEWS_SELECT })
    } catch (error: any) {
        if (error?.code === 'P2022') {
            console.warn('⚠️ NewsItem schema not fully synced, using core columns only')
            const { select, ...rest } = args
            return await db.newsItem.findUnique({ ...rest, select: CORE_NEWS_SELECT })
        }
        throw error
    }
}

export async function safeNewsCount(db: DbClient, args: Record<string, any> = {}) {
    try {
        return await db.newsItem.count(args)
    } catch (error: any) {
        if (error?.code === 'P2022') {
            return 0
        }
        throw error
    }
}
