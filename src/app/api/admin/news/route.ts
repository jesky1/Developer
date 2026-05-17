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

// Helper: generate slug from title
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET: List news items with pagination and filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    const [items, total] = await Promise.all([
      db.newsItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.newsItem.count({ where }),
    ])

    const parsed = items.map((item) => {
      let tags: string[] = []
      try {
        tags = JSON.parse(item.tags)
      } catch {
        tags = []
      }
      return { ...item, tags }
    })

    return NextResponse.json({
      data: parsed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}

// POST: Create a new news article
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      summary,
      content,
      category,
      tags,
      league,
      imageUrl,
      seoTitle,
      seoDescription,
    } = body

    if (!title || !summary) {
      return NextResponse.json(
        { error: 'Title and summary are required' },
        { status: 400 }
      )
    }

    // Generate slug from title
    let slug = toSlug(title)
    const existingSlug = await db.newsItem.findUnique({ where: { slug } })
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`
    }

    const article = await db.newsItem.create({
      data: {
        title,
        slug,
        summary,
        content: content ?? '',
        category: category ?? 'Transfer',
        tags: tags ? JSON.stringify(tags) : '[]',
        league: league ?? '',
        imageUrl: imageUrl ?? '',
        seoTitle: seoTitle ?? title.slice(0, 60),
        seoDescription: seoDescription ?? summary.slice(0, 155),
        isAiGenerated: false,
        source: 'GOALZONE',
      },
    })

    // Create activity log
    const adminId = await getAdminUserId()
    await db.activityLog.create({
      data: {
        userId: adminId,
        action: 'create',
        resource: 'news',
        resourceId: article.id,
        details: JSON.stringify({
          title: article.title,
          category: article.category,
          isAiGenerated: false,
        }),
      },
    })

    // Parse tags before returning
    let parsedTags: string[] = []
    try {
      parsedTags = JSON.parse(article.tags)
    } catch {
      parsedTags = []
    }

    return NextResponse.json({ ...article, tags: parsedTags }, { status: 201 })
  } catch (error) {
    console.error('Error creating news article:', error)
    return NextResponse.json(
      { error: 'Failed to create news article' },
      { status: 500 }
    )
  }
}
