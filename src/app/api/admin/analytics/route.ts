import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Core counts - run in parallel
    const [totalMatches, liveMatches, totalNews, totalPlayers] = await Promise.all([
      db.match.count(),
      db.match.count({ where: { status: 'LIVE' } }),
      db.newsItem.count(),
      db.player.count(),
    ])

    // Page views - simplified for performance
    const pageViewsTotal = await db.pageView.count()
    const pageViewsToday = await db.pageView.count({ where: { createdAt: { gte: todayStart } } })
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const pageViewsWeek = await db.pageView.count({ where: { createdAt: { gte: weekStart } } })

    // Daily breakdown for last 7 days - fetch all recent views and group in JS
    const recentViews = await db.pageView.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { createdAt: true, country: true, device: true, browser: true, duration: true, referrer: true },
    })

    // Group by day in JS (much faster than 7 separate DB queries)
    const dailyBreakdown: { date: string; views: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const count = recentViews.filter(v => v.createdAt >= dayStart && v.createdAt < dayEnd).length
      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        views: count,
      })
    }

    // Group by country in JS
    const countryMap = new Map<string, number>()
    recentViews.forEach(v => {
      if (v.country) {
        countryMap.set(v.country, (countryMap.get(v.country) || 0) + 1)
      }
    })
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    // Group by device in JS
    const deviceMap = new Map<string, number>()
    recentViews.forEach(v => {
      if (v.device) {
        deviceMap.set(v.device, (deviceMap.get(v.device) || 0) + 1)
      }
    })
    const deviceBreakdown = Array.from(deviceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }))

    // Group by browser in JS
    const browserMap = new Map<string, number>()
    recentViews.forEach(v => {
      if (v.browser) {
        browserMap.set(v.browser, (browserMap.get(v.browser) || 0) + 1)
      }
    })
    const browserBreakdown = Array.from(browserMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([browser, count]) => ({ browser, count }))

    // Group by referrer in JS
    const referrerMap = new Map<string, number>()
    recentViews.forEach(v => {
      const ref = v.referrer || 'direct'
      referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1)
    })
    const topReferrers = Array.from(referrerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([referrer, count]) => ({ referrer, count }))

    // Average session duration
    const durations = recentViews.filter(v => v.duration > 0).map(v => v.duration)
    const avgSessionDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    // Unread contact messages & activity count
    const [unreadContacts, activityToday] = await Promise.all([
      db.contactMessage.count({ where: { status: 'unread' } }),
      db.activityLog.count({ where: { createdAt: { gte: todayStart } } }),
    ])

    return NextResponse.json({
      totalMatches,
      liveMatches,
      totalNews,
      totalPlayers,
      pageViews: {
        today: pageViewsToday,
        thisWeek: pageViewsWeek,
        total: pageViewsTotal,
        dailyBreakdown,
      },
      topCountries,
      deviceBreakdown,
      browserBreakdown,
      topReferrers,
      avgSessionDuration,
      unreadContacts,
      activityToday,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
