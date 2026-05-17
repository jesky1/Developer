import { NextRequest, NextResponse } from 'next/server'

// Server-side GTM event tracking (for events that need to be tracked server-side)
export async function POST(request: NextRequest) {
  try {
    const { event, payload } = await request.json()

    const gtmId = process.env.NEXT_PUBLIC_GTM_ID
    if (!gtmId) {
      return NextResponse.json({ tracked: false, reason: 'GTM not configured' })
    }

    // Log the event (in production, you'd send this to GTM/GA4 Measurement Protocol)
    console.log(`[GTM Event] ${event}:`, JSON.stringify(payload))

    return NextResponse.json({ tracked: true, event })
  } catch (error) {
    return NextResponse.json({ tracked: false, error: 'Invalid request' }, { status: 400 })
  }
}
