import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/ads/track — Track ad impressions and clicks
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { adUnitId, eventType, page } = body as {
            adUnitId: string
            eventType: 'impression' | 'click'
            page?: string
        }

        if (!adUnitId || !eventType) {
            return NextResponse.json(
                { error: 'adUnitId and eventType are required' },
                { status: 400 }
            )
        }

        // Verify the ad unit exists
        const adUnit = await db.adUnit.findUnique({
            where: { id: adUnitId },
        })

        if (!adUnit) {
            return NextResponse.json(
                { error: 'Ad unit not found' },
                { status: 404 }
            )
        }

        // Estimate revenue per event
        const revenueEstimate = eventType === 'click' ? 0.05 : 0.001

        // Get request metadata
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
        const userAgent = request.headers.get('user-agent') || ''

        // Create the event
        await db.adEvent.create({
            data: {
                adUnitId,
                eventType,
                page: page || '',
                ip: ip.split(',')[0].trim(),
                userAgent,
                revenue: revenueEstimate,
            },
        })

        // Update the ad unit counters
        const updateData =
            eventType === 'click'
                ? { clicks: { increment: 1 }, revenue: { increment: revenueEstimate } }
                : { impressions: { increment: 1 }, revenue: { increment: revenueEstimate } }

        await db.adUnit.update({
            where: { id: adUnitId },
            data: updateData,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error tracking ad event:', error)
        return NextResponse.json(
            { error: 'Failed to track event' },
            { status: 500 }
        )
    }
}
