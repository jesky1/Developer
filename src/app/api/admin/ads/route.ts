import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Revenue rates
const IMPRESSION_REVENUE = 0.001
const CLICK_REVENUE = 0.15

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'units'

  try {
    switch (action) {
      case 'units': {
        const units = await db.adUnit.findMany({
          include: {
            _count: { select: { events: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ units })
      }

      case 'stats': {
        const days = parseInt(request.nextUrl.searchParams.get('days') || '7')

        // Get all ad units with their event counts
        const units = await db.adUnit.findMany({
          include: {
            events: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        })

        // Calculate totals
        let totalImpressions = 0
        let totalClicks = 0
        let totalRevenue = 0

        const perUnitBreakdown = units.map((unit) => {
          const impressions = unit.events.filter((e) => e.eventType === 'impression').length
          const clicks = unit.events.filter((e) => e.eventType === 'click').length
          const revenue = unit.events.reduce((sum, e) => sum + e.revenue, 0)

          totalImpressions += impressions
          totalClicks += clicks
          totalRevenue += revenue

          return {
            id: unit.id,
            name: unit.name,
            slotId: unit.slotId,
            placement: unit.placement,
            adType: unit.adType,
            isActive: unit.isActive,
            impressions,
            clicks,
            revenue,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          }
        })

        // Daily breakdown
        const dailyBreakdown: Record<string, { impressions: number; clicks: number; revenue: number }> = {}
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dateKey = date.toISOString().split('T')[0]
          dailyBreakdown[dateKey] = { impressions: 0, clicks: 0, revenue: 0 }
        }

        // Populate daily data from events
        const allEvents = await db.adEvent.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          },
        })

        for (const event of allEvents) {
          const dateKey = event.createdAt.toISOString().split('T')[0]
          if (dailyBreakdown[dateKey]) {
            if (event.eventType === 'impression') {
              dailyBreakdown[dateKey].impressions++
            } else {
              dailyBreakdown[dateKey].clicks++
            }
            dailyBreakdown[dateKey].revenue += event.revenue
          }
        }

        return NextResponse.json({
          totalImpressions,
          totalClicks,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          totalRevenue,
          perUnitBreakdown,
          dailyBreakdown,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Ads GET (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'create'

  try {
    switch (action) {
      case 'create': {
        const body = await request.json()
        const { name, slotId, placement, adType } = body

        if (!name || !slotId || !placement) {
          return NextResponse.json(
            { error: 'name, slotId, and placement are required' },
            { status: 400 }
          )
        }

        // Check if slotId already exists
        const existing = await db.adUnit.findUnique({ where: { slotId } })
        if (existing) {
          return NextResponse.json(
            { error: 'Ad unit with this slotId already exists' },
            { status: 400 }
          )
        }

        const unit = await db.adUnit.create({
          data: {
            name,
            slotId,
            placement,
            adType: adType || 'display',
          },
        })

        // Activity log
        await db.activityLog.create({
          data: {
            userId: null,
            action: 'create',
            resource: 'ad_unit',
            resourceId: unit.id,
            details: JSON.stringify({ name, slotId, placement, adType }),
          },
        })

        return NextResponse.json({ unit }, { status: 201 })
      }

      case 'track': {
        const body = await request.json()
        const { adUnitId, eventType, page, userAgent, country } = body

        if (!adUnitId || !eventType) {
          return NextResponse.json(
            { error: 'adUnitId and eventType are required' },
            { status: 400 }
          )
        }

        if (!['impression', 'click'].includes(eventType)) {
          return NextResponse.json(
            { error: 'eventType must be "impression" or "click"' },
            { status: 400 }
          )
        }

        // Verify ad unit exists
        const adUnit = await db.adUnit.findUnique({ where: { id: adUnitId } })
        if (!adUnit) {
          return NextResponse.json({ error: 'Ad unit not found' }, { status: 404 })
        }

        if (!adUnit.isActive) {
          return NextResponse.json({ error: 'Ad unit is not active' }, { status: 400 })
        }

        // Calculate revenue
        const revenue = eventType === 'impression' ? IMPRESSION_REVENUE : CLICK_REVENUE

        // Create event record
        const event = await db.adEvent.create({
          data: {
            adUnitId,
            eventType,
            page: page || '',
            userAgent: userAgent || '',
            country: country || '',
            revenue,
          },
        })

        // Update ad unit counters
        const updateData: Record<string, number> = { revenue: adUnit.revenue + revenue }
        if (eventType === 'impression') {
          updateData.impressions = adUnit.impressions + 1
        } else {
          updateData.clicks = adUnit.clicks + 1
        }

        await db.adUnit.update({
          where: { id: adUnitId },
          data: updateData,
        })

        return NextResponse.json({ event }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Ads POST (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
