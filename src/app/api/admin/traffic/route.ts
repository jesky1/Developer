import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'stats'

  try {
    switch (action) {
      case 'stats': {
        const period = request.nextUrl.searchParams.get('period') || '7d'

        let days = 7
        if (period === '24h') days = 1
        else if (period === '30d') days = 30

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        // Get all traffic logs for the period
        const logs = await db.trafficLog.findMany({
          where: { createdAt: { gte: since } },
        })

        // Total visitors (unique sessions)
        const uniqueSessions = new Set(logs.filter((l) => l.sessionId).map((l) => l.sessionId))
        const totalVisitors = uniqueSessions.size || logs.length

        // Total page views
        const totalPageViews = logs.length

        // Average duration
        const logsWithDuration = logs.filter((l) => l.duration > 0)
        const avgDuration =
          logsWithDuration.length > 0
            ? logsWithDuration.reduce((sum, l) => sum + l.duration, 0) / logsWithDuration.length
            : 0

        // Bounce rate (sessions with only 1 page view)
        const sessionCounts: Record<string, number> = {}
        for (const log of logs) {
          const sid = log.sessionId || log.id
          sessionCounts[sid] = (sessionCounts[sid] || 0) + 1
        }
        const singlePageSessions = Object.values(sessionCounts).filter((c) => c === 1).length
        const totalSessions = Object.keys(sessionCounts).length
        const bounceRate = totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0

        // Daily breakdown
        const dailyBreakdown: Record<string, { visitors: number; pageViews: number; avgDuration: number }> = {}
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dateKey = date.toISOString().split('T')[0]
          dailyBreakdown[dateKey] = { visitors: 0, pageViews: 0, avgDuration: 0 }
        }

        // Populate daily data
        const dailySessions: Record<string, Set<string>> = {}
        const dailyDuration: Record<string, number[]> = {}

        for (const log of logs) {
          const dateKey = log.createdAt.toISOString().split('T')[0]
          if (dailyBreakdown[dateKey]) {
            dailyBreakdown[dateKey].pageViews++
            if (!dailySessions[dateKey]) dailySessions[dateKey] = new Set()
            dailySessions[dateKey].add(log.sessionId || log.id)
            if (log.duration > 0) {
              if (!dailyDuration[dateKey]) dailyDuration[dateKey] = []
              dailyDuration[dateKey].push(log.duration)
            }
          }
        }

        for (const dateKey of Object.keys(dailyBreakdown)) {
          if (dailySessions[dateKey]) {
            dailyBreakdown[dateKey].visitors = dailySessions[dateKey].size
          }
          if (dailyDuration[dateKey] && dailyDuration[dateKey].length > 0) {
            dailyBreakdown[dateKey].avgDuration =
              dailyDuration[dateKey].reduce((a, b) => a + b, 0) / dailyDuration[dateKey].length
          }
        }

        // Top pages
        const pageCounts: Record<string, number> = {}
        for (const log of logs) {
          pageCounts[log.path] = (pageCounts[log.path] || 0) + 1
        }
        const topPages = Object.entries(pageCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([path, views]) => ({ path, views }))

        // Top referrers
        const referrerCounts: Record<string, number> = {}
        for (const log of logs) {
          if (log.referrer) {
            referrerCounts[log.referrer] = (referrerCounts[log.referrer] || 0) + 1
          }
        }
        const topReferrers = Object.entries(referrerCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([referrer, views]) => ({ referrer, views }))

        // Top countries
        const countryCounts: Record<string, number> = {}
        for (const log of logs) {
          if (log.country) {
            countryCounts[log.country] = (countryCounts[log.country] || 0) + 1
          }
        }
        const topCountries = Object.entries(countryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([country, views]) => ({ country, views }))

        // Device breakdown
        const deviceCounts: Record<string, number> = {}
        for (const log of logs) {
          if (log.device) {
            deviceCounts[log.device] = (deviceCounts[log.device] || 0) + 1
          }
        }
        const deviceBreakdown = Object.entries(deviceCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([device, count]) => ({ device, count }))

        // Browser breakdown
        const browserCounts: Record<string, number> = {}
        for (const log of logs) {
          if (log.browser) {
            browserCounts[log.browser] = (browserCounts[log.browser] || 0) + 1
          }
        }
        const browserBreakdown = Object.entries(browserCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([browser, count]) => ({ browser, count }))

        return NextResponse.json({
          totalVisitors,
          totalPageViews,
          avgDuration: Math.round(avgDuration),
          bounceRate: Math.round(bounceRate * 100) / 100,
          dailyBreakdown,
          topPages,
          topReferrers,
          topCountries,
          deviceBreakdown,
          browserBreakdown,
        })
      }

      case 'realtime': {
        // Count unique sessions in last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

        const recentLogs = await db.trafficLog.findMany({
          where: { createdAt: { gte: fiveMinutesAgo } },
          select: { sessionId: true },
        })

        const uniqueSessions = new Set(
          recentLogs.filter((l) => l.sessionId).map((l) => l.sessionId)
        )

        return NextResponse.json({
          realtimeVisitors: uniqueSessions.size,
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Traffic GET (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'log'

  try {
    switch (action) {
      case 'log': {
        const body = await request.json()
        const {
          path,
          referrer,
          country,
          device,
          browser,
          os,
          utmSource,
          utmMedium,
          utmCampaign,
          sessionId,
          duration,
        } = body

        if (!path) {
          return NextResponse.json({ error: 'path is required' }, { status: 400 })
        }

        const trafficLog = await db.trafficLog.create({
          data: {
            path,
            referrer: referrer || '',
            country: country || '',
            device: device || '',
            browser: browser || '',
            os: os || '',
            utmSource: utmSource || '',
            utmMedium: utmMedium || '',
            utmCampaign: utmCampaign || '',
            sessionId: sessionId || '',
            duration: duration || 0,
          },
        })

        return NextResponse.json({ log: trafficLog }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Traffic POST (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
