import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const match = await db.match.findUnique({
      where: { id },
      include: {
        poll: true,
      },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Parse JSON string fields the same way as the list endpoint
    const parsed = {
      ...match,
      events: JSON.parse(match.events),
      homeForm: JSON.parse(match.homeForm),
      awayForm: JSON.parse(match.awayForm),
      poll: match.poll
        ? {
            homeVotes: match.poll.homeVotes,
            drawVotes: match.poll.drawVotes,
            awayVotes: match.poll.awayVotes,
          }
        : null,
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    )
  }
}
