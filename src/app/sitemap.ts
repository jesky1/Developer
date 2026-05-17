import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://goalzone-live.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    try {
        const { db } = await import('@/lib/db')

        const [news, matches, standings] = await Promise.all([
            db.newsItem.findMany({
                orderBy: { createdAt: 'desc' },
                take: 200,
                select: { slug: true, id: true, updatedAt: true },
            }).catch(() => []),
            db.match.findMany({
                select: { id: true, updatedAt: true, homeTeam: true, awayTeam: true },
            }).catch(() => []),
            db.standing.findMany({
                select: { team: true, league: true },
                distinct: ['team'],
            }).catch(() => []),
        ])

        const now = new Date()

        // Static pages
        const staticPages: MetadataRoute.Sitemap = [
            {
                url: SITE_URL,
                lastModified: now,
                changeFrequency: 'always',
                priority: 1.0,
            },
        ]

        // Match pages
        const matchPages: MetadataRoute.Sitemap = matches.map((match) => ({
            url: `${SITE_URL}/match/${match.id}`,
            lastModified: match.updatedAt,
            changeFrequency: 'hourly' as const,
            priority: 0.8,
        }))

        // Team pages (from standings - unique teams)
        const teamPages: MetadataRoute.Sitemap = standings.map((standing) => ({
            url: `${SITE_URL}/team/${encodeURIComponent(standing.team)}`,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 0.7,
        }))

        // News pages
        const newsPages: MetadataRoute.Sitemap = news.map((article) => ({
            url: `${SITE_URL}/news/${article.slug || article.id}`,
            lastModified: article.updatedAt,
            changeFrequency: 'daily' as const,
            priority: 0.6,
        }))

        return [...staticPages, ...matchPages, ...teamPages, ...newsPages]
    } catch (error) {
        console.error('Sitemap generation error:', error)
        // Fallback: return at least the homepage
        return [
            {
                url: SITE_URL,
                lastModified: new Date(),
                changeFrequency: 'always',
                priority: 1.0,
            },
        ]
    }
}
