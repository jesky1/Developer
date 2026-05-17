import { NextResponse } from 'next/server'
import { fetchGoogleTrends } from '@/lib/google-trends'

export async function GET() {
  try {
    const topics = await fetchGoogleTrends()
    return NextResponse.json({
      topics,
      timestamp: new Date().toISOString(),
      source: 'google_trends',
    })
  } catch (error) {
    console.error('Google Trends fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    )
  }
}
