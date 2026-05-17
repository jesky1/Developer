import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type VoteOption = 'home' | 'draw' | 'away'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')

    if (matchId) {
      const poll = await db.poll.findUnique({
        where: { matchId },
      })

      if (!poll) {
        return NextResponse.json(
          { error: 'Poll not found for this match' },
          { status: 404 }
        )
      }

      return NextResponse.json({ poll })
    }

    // Return all polls if no matchId specified
    const polls = await db.poll.findMany()
    return NextResponse.json({ polls })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: { matchId?: string; vote?: VoteOption } = await request.json()
    const { matchId, vote } = body

    if (!matchId || !vote) {
      return NextResponse.json(
        { error: 'matchId and vote are required' },
        { status: 400 }
      )
    }

    const validVotes: VoteOption[] = ['home', 'draw', 'away']
    if (!validVotes.includes(vote)) {
      return NextResponse.json(
        { error: 'Vote must be "home", "draw", or "away"' },
        { status: 400 }
      )
    }

    // Check if poll exists
    const existingPoll = await db.poll.findUnique({
      where: { matchId },
    })

    if (!existingPoll) {
      return NextResponse.json(
        { error: 'Poll not found for this match' },
        { status: 404 }
      )
    }

    // Increment the appropriate vote count
    const updateData: Record<string, number> = {}
    if (vote === 'home') {
      updateData.homeVotes = existingPoll.homeVotes + 1
    } else if (vote === 'draw') {
      updateData.drawVotes = existingPoll.drawVotes + 1
    } else if (vote === 'away') {
      updateData.awayVotes = existingPoll.awayVotes + 1
    }

    const updatedPoll = await db.poll.update({
      where: { matchId },
      data: updateData,
    })

    return NextResponse.json({ poll: updatedPoll })
  } catch (error) {
    console.error('Error updating poll:', error)
    return NextResponse.json(
      { error: 'Failed to update poll' },
      { status: 500 }
    )
  }
}
