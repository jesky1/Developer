import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ============================================================
// AI-Powered Content Generation - Integrated directly
// No separate backend service needed! Works on Vercel + Supabase
// ============================================================

// --- ZAI Client (lazy initialization) ---
let zaiClient: any = null
async function getZaiClient() {
  if (!zaiClient) {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    zaiClient = await ZAI.create()
  }
  return zaiClient
}

// --- Helper: generate slug ---
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Helper: parse JSON from LLM response ---
function parseLLMJson(rawText: string): any {
  let jsonStr = rawText.trim()
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
  return JSON.parse(jsonStr.trim())
}

// ==========================================
// HANDLER: Generate Article with AI
// ==========================================
async function handleGenerate(body: any): Promise<any> {
  const { topic, category, league, language, generateImage, postToTelegram } = body
  const startTime = Date.now()

  const client = await getZaiClient()

  // Step 1: Web search for trending info
  const searchQuery = topic || 'football trending news today'
  let searchResults = ''
  try {
    const searchResponse = await client.webSearch(searchQuery)
    if (searchResponse && typeof searchResponse === 'object') {
      const results = 'results' in searchResponse ? (searchResponse as any).results : []
      searchResults = results
        .slice(0, 5)
        .map((r: any) => r.title + ': ' + (r.text || ''))
        .join('\n')
    }
  } catch {
    searchResults = 'No web search results available'
  }

  // Step 2: LLM rewrite into article
  const articleLang = language || 'en'
  const categoryInstruction = category ? `The article category is "${category}". Write content fitting this category.` : ''
  const leagueInstruction = league && league !== 'General' ? `The article is about "${league}". Focus on this league/competition.` : ''
  const langInstruction = articleLang === 'id'
    ? 'WAJIB tulis dalam bahasa Indonesia yang natural dan menarik.'
    : 'Write in professional English.'

  const prompt = `You are a professional football journalist writing for GOALZONE, a top football news platform.

Based on the following trending football information, write a complete SEO-optimized article:

TRENDING INFO:
${searchResults}

${categoryInstruction}
${leagueInstruction}
${langInstruction}

Return ONLY valid JSON in this exact format:
{
  "title": "Article title max 60 chars, catchy & SEO-friendly",
  "summary": "Article summary max 155 chars with main keyword",
  "content": "Full article 4-6 paragraphs, each 2-3 sentences. Professional football analysis with stats and context.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoTitle": "SEO title max 60 chars",
  "seoDescription": "SEO description max 155 chars with keyword",
  "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "league": "${league || 'General'}"
}

IMPORTANT:
- Article must be ORIGINAL content, not copied from any source
- Include player names, teams, and league context
- Optimize for SEO but keep it natural
- Do not use excessive quotes`

  const response = await client.chat.completions.create({
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [
      { role: 'system', content: 'You are a professional football journalist who writes high-quality SEO-optimized articles.' },
      { role: 'user', content: prompt },
    ],
  })

  const rawText = response.choices?.[0]?.message?.content ?? ''

  let parsed: any
  try {
    parsed = parseLLMJson(rawText)
  } catch {
    return { error: 'Failed to parse AI response as JSON', raw: rawText.slice(0, 200) }
  }

  // Step 3: Generate slug
  const slug = toSlug(parsed.title || 'untitled')
  let finalSlug = slug
  const existingSlug = await db.newsItem.findUnique({ where: { slug: finalSlug } })
  if (existingSlug) finalSlug = `${slug}-${Date.now()}`

  // Step 4: Get existing articles for internal links
  const existingArticles = await db.newsItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { slug: true, title: true, category: true, tags: true, league: true },
  })

  const articleTags = Array.isArray(parsed.tags) ? parsed.tags : []
  const relatedArticles = existingArticles.filter((a: any) => {
    try {
      const aTags = JSON.parse(a.tags)
      return Array.isArray(aTags) && aTags.some((t: string) => articleTags.includes(t)) || a.category === parsed.league
    } catch { return false }
  })

  // Add internal links to content
  let content = parsed.content || ''
  for (const related of relatedArticles.slice(0, 3)) {
    if (related.slug) {
      content += `\n\nRelated: [${related.title}](/news/${related.slug})`
    }
  }

  // Step 5: Generate cover image with AI (optional)
  let imageUrl = ''
  if (generateImage !== false) {
    try {
      const imagePrompt = `Football news article cover image: ${parsed.title}, professional sports journalism style, dramatic lighting, stadium atmosphere`
      const imageResponse = await client.images.generations.create({
        prompt: imagePrompt,
        size: '1344x768',
      })
      const imageBase64 = imageResponse.data[0]?.base64
      if (imageBase64) {
        const imagesDir = join(process.cwd(), 'public', 'generated')
        mkdirSync(imagesDir, { recursive: true })
        const filename = `${finalSlug}-${Date.now()}.png`
        writeFileSync(join(imagesDir, filename), Buffer.from(imageBase64, 'base64'))
        imageUrl = `/generated/${filename}`
      }
    } catch (imgError) {
      console.error('Image generation failed (non-blocking):', imgError)
    }
  }

  // Step 6: Save to database
  const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const tagsJson = JSON.stringify(articleTags)

  await db.newsItem.create({
    data: {
      id,
      title: (parsed.title || 'Untitled').slice(0, 60),
      slug: finalSlug,
      summary: (parsed.summary || '').slice(0, 155),
      content,
      category: category || 'Breaking',
      imageUrl,
      source: 'GOALZONE AI',
      tags: tagsJson,
      seoTitle: (parsed.seoTitle || parsed.title || '').slice(0, 60),
      seoDescription: (parsed.seoDescription || parsed.summary || '').slice(0, 155),
      keywords: parsed.keywords || '',
      league: parsed.league || league || '',
      isAiGenerated: true,
    },
  })

  // Step 7: Create internal links
  for (const related of relatedArticles.slice(0, 3)) {
    if (related.slug) {
      try {
        await db.internalLink.upsert({
          where: { sourceSlug_targetSlug: { sourceSlug: finalSlug, targetSlug: related.slug } },
          update: {},
          create: {
            id: `il_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sourceSlug: finalSlug,
            targetSlug: related.slug,
            anchorText: related.title,
          },
        })
      } catch { /* skip duplicates */ }
    }
  }

  // Step 8: Activity log
  try {
    await db.activityLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'generate',
        resource: 'article',
        resourceId: id,
        details: JSON.stringify({ title: parsed.title, method: 'integrated-ai', hasImage: !!imageUrl }),
        ip: '',
      },
    })
  } catch { /* non-blocking */ }

  // Step 9: Auto-post to Telegram (optional)
  let telegramResult = null
  if (postToTelegram) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (botToken && chatId) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://goalzone.app'
        const msg = `⚽ *${parsed.title}*\n\n${parsed.summary}\n\n🔗 ${siteUrl}/news/${finalSlug}`
        const tr = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
        })
        const td = await tr.json()
        telegramResult = { sent: td.ok, error: td.ok ? null : td.description }
      } catch {
        telegramResult = { sent: false, error: 'Telegram API unavailable' }
      }
    } else {
      telegramResult = { sent: false, error: 'Bot not configured' }
    }
  }

  const generationTime = Date.now() - startTime
  const now = new Date().toISOString()

  return {
    article: {
      id,
      title: (parsed.title || 'Untitled').slice(0, 60),
      slug: finalSlug,
      summary: (parsed.summary || '').slice(0, 155),
      content,
      category: category || 'Breaking',
      imageUrl,
      source: 'GOALZONE AI',
      tags: articleTags,
      seoTitle: (parsed.seoTitle || parsed.title || '').slice(0, 60),
      seoDescription: (parsed.seoDescription || parsed.summary || '').slice(0, 155),
      keywords: parsed.keywords || '',
      league: parsed.league || league || '',
      isAiGenerated: true,
      publishedAt: now,
      createdAt: now,
    },
    meta: {
      generationTime,
      hasImage: !!imageUrl,
      telegramResult,
      relatedArticlesLinked: relatedArticles.length,
      searchResultsUsed: searchResults !== 'No web search results available',
    },
  }
}

// ==========================================
// HANDLER: Scrape Trending Topics
// ==========================================
async function handleTrendingScrape(): Promise<any> {
  const client = await getZaiClient()

  const searchQueries = [
    'trending football news today',
    'football transfer news latest',
    'Premier League highlights today',
  ]

  const topics: any[] = []

  for (const query of searchQueries) {
    try {
      const searchResponse = await client.webSearch(query)
      if (searchResponse && typeof searchResponse === 'object') {
        const results = 'results' in searchResponse ? (searchResponse as any).results : []
        for (const result of results.slice(0, 3)) {
          const title = result.title || query
          topics.push({
            keyword: title.slice(0, 200),
            volume: Math.floor(Math.random() * 10000) + 1000,
            source: 'google',
            category: query.includes('transfer') ? 'Transfer' : query.includes('Premier') ? 'Match Report' : 'Breaking',
          })
        }
      }
    } catch {
      // Skip failed searches
    }
  }

  // Save to database
  const createdTopics = []
  for (const topic of topics) {
    try {
      const existing = await db.trendingTopic.findFirst({ where: { keyword: topic.keyword } })
      if (!existing) {
        const id = `tt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        await db.trendingTopic.create({
          data: {
            id,
            keyword: topic.keyword,
            source: topic.source,
            volume: topic.volume,
            category: topic.category,
            region: 'global',
            isProcessed: false,
          },
        })
        createdTopics.push({ id, ...topic })
      }
    } catch { /* skip duplicates */ }
  }

  return {
    topicsFound: topics.length,
    newTopics: createdTopics.length,
    topics: createdTopics,
  }
}

// ==========================================
// HANDLER: TikTok Script
// ==========================================
async function handleTiktokScript(topic?: string): Promise<any> {
  let scriptTopic = topic
  if (!scriptTopic) {
    const trending = await db.trendingTopic.findFirst({
      where: { isProcessed: false },
      orderBy: { volume: 'desc' },
    })
    scriptTopic = trending?.keyword || 'football highlights'
  }

  const client = await getZaiClient()
  const prompt = `You are a viral TikTok script writer for a football content channel called GOALZONE.

Write a TikTok script (60-90 seconds) about: "${scriptTopic}"

Return ONLY valid JSON:
{
  "hook": "First 3 seconds - attention-grabbing opening line",
  "script": "Full script text with [VISUAL] and [AUDIO] cues, pacing notes",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "suggestedTitle": "TikTok video title max 80 chars",
  "duration": "estimated duration in seconds"
}

IMPORTANT:
- Hook must stop scrolling in first 1-2 seconds
- Use energetic, engaging tone
- Include specific stats/facts for credibility
- Add call-to-action (follow/like)
- Script should be 120-180 words (60-90 seconds)`

  const response = await client.chat.completions.create({
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [
      { role: 'system', content: 'You are a viral TikTok script writer specializing in football content.' },
      { role: 'user', content: prompt },
    ],
  })

  const rawText = response.choices?.[0]?.message?.content ?? ''
  try {
    const parsed = parseLLMJson(rawText)
    return { topic: scriptTopic, ...parsed }
  } catch {
    return { topic: scriptTopic, script: rawText, note: 'AI response was not valid JSON' }
  }
}

// ==========================================
// GET Handler
// ==========================================
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'schedule'

  try {
    switch (action) {
      case 'schedule': {
        const tasks = await db.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json({ tasks })
      }

      case 'trending': {
        // Try AI-powered trending, fallback to DB
        try {
          const topics = await db.trendingTopic.findMany({ orderBy: { volume: 'desc' }, take: 20 })
          return NextResponse.json({ topics })
        } catch {
          return NextResponse.json({ topics: [] })
        }
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Auto-content GET (${action}) error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ==========================================
// POST Handler
// ==========================================
export const maxDuration = 120 // 2 minutes timeout for AI operations (Vercel Pro)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'generate'

  try {
    let body: Record<string, unknown> = {}
    try { body = await request.json() } catch { /* empty */ }

    switch (action) {
      case 'generate': {
        try {
          const result = await handleGenerate(body)
          return NextResponse.json(result, { status: result.error ? 500 : 201 })
        } catch (aiError) {
          console.error('AI generation failed:', aiError)

          // Fallback: create basic article template
          const topic = (body.topic as string) || 'football trending news today'
          const category = (body.category as string) || 'Breaking'
          const league = (body.league as string) || 'General'

          const slug = toSlug(topic)
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
            meta: { generationTime: 0, hasImage: false, telegramResult: null, relatedArticlesLinked: 0, searchResultsUsed: false, note: 'AI unavailable - created template article' },
          }, { status: 201 })
        }
      }

      case 'trending': {
        try {
          const result = await handleTrendingScrape()
          return NextResponse.json(result)
        } catch (error) {
          console.error('Trending scrape failed:', error)
          return NextResponse.json({ error: 'Trending scrape failed', topicsFound: 0, newTopics: 0, topics: [] })
        }
      }

      case 'tiktok-script': {
        try {
          const result = await handleTiktokScript(body.topic as string)
          return NextResponse.json(result)
        } catch (error) {
          console.error('TikTok script failed:', error)
          return NextResponse.json({ error: 'TikTok script generation failed' }, { status: 500 })
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
        const { type, schedule, isEnabled } = body as { type: string; schedule: string; isEnabled?: boolean }
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
        const { newsId, chatId, message } = body as { newsId?: string; chatId?: string; message?: string }
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
