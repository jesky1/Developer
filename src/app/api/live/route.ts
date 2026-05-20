import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const matches = await db.match.findMany({
      where: {
        status: {
          in: ['LIVE', 'HT'],
        },
      },
      include: {
        poll: true,
      },
    })

    // Simulate real-time minute increment for live matches
    const simulatedMatches = matches.map((match) => {
      let simulatedMinute = match.minute

      if (match.status === 'LIVE') {
        simulatedMinute = Math.min(match.minute + 1, 90)
      }

      return {
        ...match,
        minute: simulatedMinute,
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
    })

    return NextResponse.json(simulatedMatches)
  } catch (error) {
    console.error('Error fetching live matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live matches' },
      { status: 500 }
    )
  }
}
