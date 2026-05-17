import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET: List contact messages (optionally filter by ?status=)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const contacts = await db.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact messages' },
      { status: 500 }
    )
  }
}

// PATCH: Update contact message status or add reply
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, reply } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Contact message ID is required' },
        { status: 400 }
      )
    }

    const existing = await db.contactMessage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (status) {
      const validStatuses = ['unread', 'read', 'replied', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      data.status = status
    }
    if (reply !== undefined) {
      data.reply = reply
      // If replying, auto-set status to replied
      if (reply && !status) {
        data.status = 'replied'
      }
    }

    const updated = await db.contactMessage.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating contact message:', error)
    return NextResponse.json(
      { error: 'Failed to update contact message' },
      { status: 500 }
    )
  }
}
