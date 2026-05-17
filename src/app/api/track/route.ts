import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, referrer, country, device, browser, os, duration } = body as {
      path: string
      referrer?: string
      country?: string
      device?: string
      browser?: string
      os?: string
      duration?: number
    }

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Create TrafficLog record
    const trafficLog = await db.trafficLog.create({
      data: {
        path,
        referrer: referrer || '',
        country: country || '',
        device: device || '',
        browser: browser || '',
        os: os || '',
        duration: duration || 0,
      },
    })

    // Create PageView record
    await db.pageView.create({
      data: {
        path,
        referrer: referrer || '',
        country: country || '',
        device: device || '',
        browser: browser || '',
        os: os || '',
        duration: duration || 0,
      },
    })

    return NextResponse.json({ success: true, logId: trafficLog.id }, { status: 201 })
  } catch (error) {
    console.error('Public track error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
