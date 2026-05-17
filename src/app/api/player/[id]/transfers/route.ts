import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transfers = await db.transfer.findMany({
      where: { playerId: id },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(transfers)
  } catch (error) {
    console.error('Error fetching player transfers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}
