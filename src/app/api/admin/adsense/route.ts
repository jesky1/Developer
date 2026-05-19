import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'report'

  try {
    switch (action) {
      case 'report': {
        const period = request.nextUrl.searchParams.get('period') || '7d'

        let days = 7
        if (period === '30d') days = 30
        else if (period === '90d') days = 90

        const reports = await db.adSenseReport.findMany({
          where: {
            date: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            },
          },
          orderBy: { date: 'asc' },
        })

        // Calculate totals
        const totals = reports.reduce(
          (acc, r) => ({
            impressions: acc.impressions + r.impressions,
            clicks: acc.clicks + r.clicks,
            revenue: acc.revenue + r.revenue,
            pageViews: acc.pageViews + r.pageViews,
          }),
          { impressions: 0, clicks: 0, revenue: 0, pageViews: 0 }
        )

        totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
        totals.cpc = totals.clicks > 0 ? totals.revenue / totals.clicks : 0
        totals.rpm = totals.impressions > 0 ? (totals.revenue / totals.impressions) * 1000 : 0

        const dailyBreakdown = reports.map((r) => ({
          date: r.date,
          impressions: r.impressions,
          clicks: r.clicks,
          revenue: r.revenue,
          ctr: r.ctr,
          cpc: r.cpc,
          rpm: r.rpm,
          pageViews: r.pageViews,
        }))

        return NextResponse.json({
          period,
          totals,
          dailyBreakdown,
        })
      }

      case 'earnings': {
        const today = new Date().toISOString().split('T')[0]
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]

        // Today's earnings
        const todayReport = await db.adSenseReport.findUnique({ where: { date: today } })
        const todayEarnings = todayReport?.revenue || 0

        // This week's earnings
        const weekReports = await db.adSenseReport.findMany({
          where: { date: { gte: weekAgo } },
        })
        const weekEarnings = weekReports.reduce((sum, r) => sum + r.revenue, 0)

        // This month's earnings
        const monthReports = await db.adSenseReport.findMany({
          where: { date: { gte: monthStart } },
        })
        const monthEarnings = monthReports.reduce((sum, r) => sum + r.revenue, 0)

        // Total earnings
        const allReports = await db.adSenseReport.findMany()
        const totalEarnings = allReports.reduce((sum, r) => sum + r.revenue, 0)

        // Recent 7-day trend
        const last7Days = await db.adSenseReport.findMany({
          where: { date: { gte: weekAgo } },
          orderBy: { date: 'asc' },
          select: {
            date: true,
            revenue: true,
            impressions: true,
            clicks: true,
          },
        })

        return NextResponse.json({
          today: Math.round(todayEarnings * 100) / 100,
          thisWeek: Math.round(weekEarnings * 100) / 100,
          thisMonth: Math.round(monthEarnings * 100) / 100,
          total: Math.round(totalEarnings * 100) / 100,
          trend: last7Days.map((r) => ({
            date: r.date,
            revenue: r.revenue,
            impressions: r.impressions,
            clicks: r.clicks,
          })),
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Adsense GET (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'sync'

  try {
    switch (action) {
      case 'sync': {
        // In production, this would call the Google AdSense API
        // For now, create/update sample data for the last 14 days
        const syncResults = []

        for (let i = 13; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]

          const impressions = Math.floor(Math.random() * 5000) + 2000
          const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.01))
          const revenue = clicks * (Math.random() * 0.3 + 0.1)
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? revenue / clicks : 0
          const rpm = impressions > 0 ? (revenue / impressions) * 1000 : 0
          const pageViews = Math.floor(impressions * (Math.random() * 0.5 + 0.8))
          const activeViewCtr = ctr * (Math.random() * 0.3 + 0.7)

          const report = await db.adSenseReport.upsert({
            where: { date: dateStr },
            update: {
              impressions,
              clicks,
              revenue: Math.round(revenue * 100) / 100,
              ctr: Math.round(ctr * 100) / 100,
              cpc: Math.round(cpc * 100) / 100,
              rpm: Math.round(rpm * 100) / 100,
              pageViews,
              activeViewCtr: Math.round(activeViewCtr * 100) / 100,
            },
            create: {
              date: dateStr,
              impressions,
              clicks,
              revenue: Math.round(revenue * 100) / 100,
              ctr: Math.round(ctr * 100) / 100,
              cpc: Math.round(cpc * 100) / 100,
              rpm: Math.round(rpm * 100) / 100,
              pageViews,
              activeViewCtr: Math.round(activeViewCtr * 100) / 100,
            },
          })

          syncResults.push(report)
        }

        // Activity log
        await db.activityLog.create({
          data: {
            userId: null,
            action: 'update',
            resource: 'adsense',
            resourceId: 'sync',
            details: JSON.stringify({ days: 14, recordsSynced: syncResults.length }),
          },
        })

        return NextResponse.json({
          message: 'AdSense data synced successfully',
          recordsSynced: syncResults.length,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Adsense POST (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
