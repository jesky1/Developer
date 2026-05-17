import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Helper: find a superadmin user ID for activity logging
async function getAdminUserId(): Promise<string> {
  const superadmin = await db.adminUser.findFirst({
    where: { role: 'superadmin', isActive: true },
  })
  if (superadmin) return superadmin.id
  const anyAdmin = await db.adminUser.findFirst()
  return anyAdmin?.id ?? 'system'
}

// GET: Get single news article
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await db.newsItem.findUnique({ where: { id } })

    if (!article) {
      return NextResponse.json(
        { error: 'News article not found' },
        { status: 404 }
      )
    }

    let tags: string[] = []
    try {
      tags = JSON.parse(article.tags)
    } catch {
      tags = []
    }

    return NextResponse.json({ ...article, tags })
  } catch (error) {
    console.error('Error fetching news article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news article' },
      { status: 500 }
    )
  }
}

// PATCH: Update news article
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.newsItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'News article not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    const allowedFields = [
      'title', 'summary', 'content', 'category', 'tags',
      'league', 'imageUrl', 'seoTitle', 'seoDescription',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Tags needs to be stringified
        if (field === 'tags' && Array.isArray(body[field])) {
          data[field] = JSON.stringify(body[field])
        } else {
          data[field] = body[field]
        }
      }
    }

    // If title is changed, update slug
    if (body.title && body.title !== existing.title) {
      const slug = body.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const existingSlug = await db.newsItem.findUnique({ where: { slug } })
      data.slug = existingSlug ? `${slug}-${Date.now()}` : slug
    }

    const article = await db.newsItem.update({
      where: { id },
      data,
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'update',
        resource: 'news',
        resourceId: id,
        details: JSON.stringify({
          updatedFields: Object.keys(data),
          title: article.title,
        }),
      },
    })

    let tags: string[] = []
    try {
      tags = JSON.parse(article.tags)
    } catch {
      tags = []
    }

    return NextResponse.json({ ...article, tags })
  } catch (error) {
    console.error('Error updating news article:', error)
    return NextResponse.json(
      { error: 'Failed to update news article' },
      { status: 500 }
    )
  }
}

// DELETE: Delete news article
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.newsItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'News article not found' },
        { status: 404 }
      )
    }

    // Create activity log before deletion
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'delete',
        resource: 'news',
        resourceId: id,
        details: JSON.stringify({
          title: existing.title,
          category: existing.category,
        }),
      },
    })

    await db.newsItem.delete({ where: { id } })

    return NextResponse.json({ message: 'News article deleted successfully' })
  } catch (error) {
    console.error('Error deleting news article:', error)
    return NextResponse.json(
      { error: 'Failed to delete news article' },
      { status: 500 }
    )
  }
}
