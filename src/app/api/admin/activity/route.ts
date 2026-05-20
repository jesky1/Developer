import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET: List activity logs with pagination + filtering
// Query params: page, limit, userId, action, resource
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit

    // Filters
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const resource = searchParams.get('resource') || undefined

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (action) where.action = action
    if (resource) where.resource = resource

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              displayName: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      db.activityLog.count({ where }),
    ])

    const result = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ip: log.ip,
      createdAt: log.createdAt,
      user: log.user,
    }))

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}
