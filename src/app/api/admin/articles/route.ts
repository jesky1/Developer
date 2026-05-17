import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Helper to parse JSON fields on articles
function parseArticleFields(article: Record<string, unknown>) {
  let tags: string[] = []
  try {
    tags = JSON.parse(article.tags as string)
  } catch {
    tags = []
  }

  let seoKeywords: string[] = []
  try {
    seoKeywords = JSON.parse(article.seoKeywords as string)
  } catch {
    seoKeywords = []
  }

  return {
    ...article,
    tags,
    seoKeywords,
  }
}

// Helper to delete image file from disk
function deleteImageFile(imageUrl: string) {
  if (imageUrl && imageUrl.startsWith('/news-images/')) {
    const filePath = path.join(process.cwd(), 'public', imageUrl)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (err) {
      console.error(`[Admin] Failed to delete image file: ${filePath}`, err)
    }
  }
}

// GET - List articles with admin-level detail
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status') // published, draft, all

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.NewsItemWhereInput = {}

    if (category) {
      where.category = category
    }

    if (status === 'published') {
      where.isPublished = true
    } else if (status === 'draft') {
      where.isPublished = false
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const [articles, total] = await Promise.all([
      db.newsItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.newsItem.count({ where }),
    ])

    const parsed = articles.map(parseArticleFields)

    return NextResponse.json({
      articles: parsed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error listing articles:', error)
    return NextResponse.json(
      { error: 'Failed to list articles' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete articles
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of article IDs' },
        { status: 400 }
      )
    }

    // Get image URLs before deleting
    const articles = await db.newsItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, imageUrl: true },
    })

    // Delete from database
    const result = await db.newsItem.deleteMany({
      where: { id: { in: ids } },
    })

    // Delete associated image files
    for (const article of articles) {
      if (article.imageUrl) {
        deleteImageFile(article.imageUrl)
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('Error bulk deleting articles:', error)
    return NextResponse.json(
      { error: 'Failed to bulk delete articles' },
      { status: 500 }
    )
  }
}

// PATCH - Bulk update articles
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, action } = body as {
      ids: string[]
      action: 'publish' | 'unpublish' | 'setHeadline' | 'unsetHeadline'
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of article IDs' },
        { status: 400 }
      )
    }

    if (!action || !['publish', 'unpublish', 'setHeadline', 'unsetHeadline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: publish, unpublish, setHeadline, unsetHeadline' },
        { status: 400 }
      )
    }

    let updateData: Prisma.NewsItemUpdateManyMutationInput = {}

    switch (action) {
      case 'publish':
        updateData = { isPublished: true, publishedAt: new Date() }
        break
      case 'unpublish':
        updateData = { isPublished: false }
        break
      case 'setHeadline':
        updateData = { isHeadline: true }
        break
      case 'unsetHeadline':
        updateData = { isHeadline: false }
        break
    }

    const result = await db.newsItem.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      action,
    })
  } catch (error) {
    console.error('Error bulk updating articles:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update articles' },
      { status: 500 }
    )
  }
}
