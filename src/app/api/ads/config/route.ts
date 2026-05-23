import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/ads/config — Public endpoint for ad configuration
// Returns the AdSense client ID and active ad units for the frontend
export async function GET() {
  try {
    // Fetch adsense_client_id from site settings
    const adsenseSetting = await db.siteSetting.findUnique({
      where: { key: 'adsense_client_id' },
    })

    const clientId = adsenseSetting?.value || ''

    // Fetch active ad units only when clientId is configured
    const adUnits = clientId
      ? await db.adUnit.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slotId: true,
          placement: true,
          adType: true,
          isActive: true,
        },
        orderBy: { placement: 'asc' },
      })
      : []

    return NextResponse.json(
      { clientId, adUnits },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching ad config:', error)
    return NextResponse.json(
      { clientId: '', adUnits: [] },
      { status: 200 }
    )
  }
}
