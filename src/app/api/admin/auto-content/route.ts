import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// AI Service port - separate process to prevent OOM from heavy SDK imports
const AI_SERVICE_PORT = 3005

// Helper: proxy request to AI mini-service
async function proxyToAIService(path: string, method: string, body?: string) {
  const url = `http://localhost:${AI_SERVICE_PORT}${path}`
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
  }
  if (body && method !== 'GET') {
    options.body = body
  }
  return fetch(url, options)
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'schedule'

  try {
    switch (action) {
      case 'schedule': {
        const tasks = await db.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json({ tasks })
      }

      case 'trending': {
        // Proxy to AI service
        try {
          const aiRes = await proxyToAIService('/trending', 'GET')
          if (aiRes.ok) return NextResponse.json(await aiRes.json())
        } catch { /* fall through */ }

        // Fallback to DB
        const topics = await db.trendingTopic.findMany({ orderBy: { volume: 'desc' }, take: 20 })
        return NextResponse.json({ topics })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auto-content GET (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'generate'

  try {
    // Read body once
    let bodyStr = '{}'
    try { bodyStr = JSON.stringify(await request.json()) } catch { /* empty */ }

    switch (action) {
      case 'generate': {
        // Proxy to AI mini-service (handles web search, LLM, image gen, DB write)
        try {
          const aiRes = await proxyToAIService('/generate', 'POST', bodyStr)
          const data = await aiRes.json()
          return NextResponse.json(data, { status: aiRes.ok ? 201 : aiRes.status })
        } catch (aiError) {
          console.error('AI service unavailable:', aiError)

          // Fallback: create basic article template via Prisma
          let parsedBody: Record<string, unknown> = {}
          try { parsedBody = JSON.parse(bodyStr) } catch { /* empty */ }

          const topic = (parsedBody.topic as string) || 'football trending news today'
          const category = (parsedBody.category as string) || 'Breaking'
          const league = (parsedBody.league as string) || 'General'

          const slug = topic.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
          let finalSlug = slug
          const existing = await db.newsItem.findUnique({ where: { slug: finalSlug } })
          if (existing) finalSlug = `${slug}-${Date.now()}`

          const article = await db.newsItem.create({
            data: {
              title: topic.slice(0, 60),
              slug: finalSlug,
              summary: `Latest updates on ${topic}. Stay tuned for more football news on GOALZONE.`,
              content: `This article covers the latest developments regarding ${topic}. Check back soon for full AI-generated analysis.\n\nFollow GOALZONE for real-time football scores, news, and analysis.`,
              category,
              tags: JSON.stringify([topic.split(' ').slice(0, 2).join(' '), league, category]),
              league,
              isAiGenerated: true,
              source: 'GOALZONE AI',
            },
          })

          try {
            await db.activityLog.create({
              data: { userId: null, action: 'generate', resource: 'article', resourceId: article.id, details: JSON.stringify({ title: article.title, method: 'fallback' }) },
            })
          } catch { /* non-blocking */ }

          let parsedTags: string[] = []
          try { parsedTags = JSON.parse(article.tags) } catch { parsedTags = [] }

          return NextResponse.json({
            article: { ...article, tags: parsedTags },
            meta: { generationTime: 0, hasImage: false, telegramResult: null, relatedArticlesLinked: 0, searchResultsUsed: false, note: 'AI service unavailable - created template article' },
          }, { status: 201 })
        }
      }

      case 'trending': {
        try {
          const aiRes = await proxyToAIService('/trending', 'POST')
          return NextResponse.json(await aiRes.json())
        } catch {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }
      }

      case 'tiktok-script': {
        try {
          const aiRes = await proxyToAIService('/tiktok-script', 'POST', bodyStr)
          return NextResponse.json(await aiRes.json())
        } catch {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }
      }

      case 'internal-links': {
        const articles = await db.newsItem.findMany({
          where: { slug: { not: null } },
          select: { id: true, slug: true, title: true, category: true, tags: true, league: true },
        })

        let linksCreated = 0
        for (let i = 0; i < articles.length; i++) {
          const source = articles[i]
          if (!source.slug) continue
          let sourceTags: string[] = []
          try { sourceTags = JSON.parse(source.tags) as string[] } catch { sourceTags = [] }

          for (let j = 0; j < articles.length; j++) {
            if (i === j) continue
            const target = articles[j]
            if (!target.slug) continue
            let targetTags: string[] = []
            try { targetTags = JSON.parse(target.tags) as string[] } catch { targetTags = [] }

            const sharedTags = sourceTags.filter((t: string) => targetTags.includes(t))
            const sameLeague = source.league && source.league === target.league
            const sameCategory = source.category === target.category

            if (sharedTags.length > 0 || sameLeague || sameCategory) {
              try {
                await db.internalLink.upsert({
                  where: { sourceSlug_targetSlug: { sourceSlug: source.slug, targetSlug: target.slug } },
                  update: {},
                  create: { sourceSlug: source.slug, targetSlug: target.slug, anchorText: target.title },
                })
                linksCreated++
              } catch { /* skip */ }
            }
          }
        }

        try {
          await db.activityLog.create({
            data: { userId: null, action: 'generate', resource: 'internal_links', resourceId: 'bulk', details: JSON.stringify({ linksCreated, totalArticles: articles.length }) },
          })
        } catch { /* non-blocking */ }

        return NextResponse.json({ linksCreated, totalArticles: articles.length })
      }

      case 'schedule': {
        let parsedBody: Record<string, unknown> = {}
        try { parsedBody = JSON.parse(bodyStr) } catch { /* empty */ }

        const { type, schedule, isEnabled } = parsedBody as { type: string; schedule: string; isEnabled?: boolean }
        if (!type || !schedule) return NextResponse.json({ error: 'type and schedule are required' }, { status: 400 })

        const existing = await db.scheduledTask.findFirst({ where: { type } })
        let task
        if (existing) {
          task = await db.scheduledTask.update({ where: { id: existing.id }, data: { schedule, isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled } })
        } else {
          task = await db.scheduledTask.create({ data: { type, schedule, isEnabled: isEnabled !== undefined ? isEnabled : true } })
        }

        try {
          await db.activityLog.create({
            data: { userId: null, action: existing ? 'update' : 'create', resource: 'scheduled_task', resourceId: task.id, details: JSON.stringify({ type, schedule, isEnabled }) },
          })
        } catch { /* non-blocking */ }

        return NextResponse.json({ task })
      }

      case 'telegram': {
        let parsedBody: Record<string, unknown> = {}
        try { parsedBody = JSON.parse(bodyStr) } catch { /* empty */ }

        const { newsId, chatId, message } = parsedBody as { newsId?: string; chatId?: string; message?: string }
        let finalMessage = message || ''
        let finalChatId = chatId || process.env.TELEGRAM_CHAT_ID || ''

        if (newsId) {
          const article = await db.newsItem.findUnique({ where: { id: newsId } })
          if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
          finalMessage = `⚽ *${article.title}*\n\n${article.summary}\n\n🔗 https://goalzone.app/news/${article.slug || article.id}`
        }

        if (!finalMessage) return NextResponse.json({ error: 'message or newsId is required' }, { status: 400 })

        const telegramPost = await db.telegramPost.create({
          data: { newsId: newsId || null, chatId: finalChatId, message: finalMessage, status: 'pending' },
        })

        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken && finalChatId) {
          try {
            const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: finalChatId, text: finalMessage, parse_mode: 'Markdown' }),
            })
            const telegramResult = await telegramResponse.json() as { ok: boolean; description?: string }

            if (telegramResult.ok) {
              await db.telegramPost.update({ where: { id: telegramPost.id }, data: { status: 'sent', sentAt: new Date() } })
            } else {
              await db.telegramPost.update({ where: { id: telegramPost.id }, data: { status: 'failed', error: telegramResult.description || 'Unknown error' } })
            }

            return NextResponse.json({ success: telegramResult.ok, post: { id: telegramPost.id, status: telegramResult.ok ? 'sent' : 'failed' } })
          } catch {
            await db.telegramPost.update({ where: { id: telegramPost.id }, data: { status: 'failed', error: 'API unavailable' } })
            return NextResponse.json({ success: false, post: { id: telegramPost.id, status: 'failed' } })
          }
        }

        return NextResponse.json({ success: false, post: { id: telegramPost.id, status: 'pending', note: 'Bot not configured' } })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auto-content POST (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
