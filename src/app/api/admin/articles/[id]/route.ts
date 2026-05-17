import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await db.newsItem.findUnique({ where: { id } })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    let tags: string[] = []
    try { tags = JSON.parse(article.tags) } catch { tags = [] }

    return NextResponse.json({
      ...article,
      tags,
      publishedAt: article.publishedAt.toISOString(),
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, summary, category, isPublished, isHeadline, content } = body as {
      title?: string
      summary?: string
      category?: string
      isPublished?: boolean
      isHeadline?: boolean
      content?: string
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (summary !== undefined) updateData.summary = summary
    if (category !== undefined) updateData.category = category
    if (isPublished !== undefined) updateData.isPublished = isPublished
    if (isHeadline !== undefined) updateData.isHeadline = isHeadline
    if (content !== undefined) updateData.content = content

    const article = await db.newsItem.update({
      where: { id },
      data: updateData,
    })

    let tags: string[] = []
    try { tags = JSON.parse(article.tags) } catch { tags = [] }

    return NextResponse.json({
      ...article,
      tags,
      publishedAt: article.publishedAt.toISOString(),
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.newsItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
