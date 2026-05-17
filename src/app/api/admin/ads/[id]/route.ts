import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.adUnit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Ad unit not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.slotId !== undefined) updateData.slotId = body.slotId
    if (body.placement !== undefined) updateData.placement = body.placement
    if (body.adType !== undefined) updateData.adType = body.adType
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const unit = await db.adUnit.update({
      where: { id },
      data: updateData,
    })

    await db.activityLog.create({
      data: {
        userId: null,
        action: 'update',
        resource: 'ad_unit',
        resourceId: id,
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ unit })
  } catch (error) {
    console.error('Update ad unit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.adUnit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Ad unit not found' }, { status: 404 })
    }

    await db.adUnit.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        userId: null,
        action: 'delete',
        resource: 'ad_unit',
        resourceId: id,
        details: JSON.stringify({ name: existing.name, slotId: existing.slotId }),
      },
    })

    return NextResponse.json({ message: 'Ad unit deleted successfully' })
  } catch (error) {
    console.error('Delete ad unit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
