/**
 * GOALZONE AI Service
 * Runs on port 3005 - handles AI article generation, trending scraping, etc.
 * Separated from main Next.js to prevent OOM from z-ai-web-dev-sdk
 */

import { createServer } from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Database } from 'bun:sqlite'
import ZAI from 'z-ai-web-dev-sdk'

const PORT = 3005
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || join(dirname(fileURLToPath(import.meta.url)), '../../../db/custom.db')

// Open database with Bun's built-in SQLite
const db = new Database(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

// Helper: generate slug
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Helper: parse JSON safely
function safeJsonParse(str: string, fallback: any = {}) {
  try { return JSON.parse(str) } catch { return fallback }
}

// Helper: run SQL and return results
function runQuery(sql: string, params: any[] = []): any[] {
  try {
    const stmt = db.query(sql)
    return stmt.all(...params) as any[]
  } catch (err) {
    console.error('SQL Error:', err)
    return []
  }
}

function runRun(sql: string, params: any[] = []): any {
  try {
    const stmt = db.query(sql)
    return stmt.run(...params)
  } catch (err) {
    console.error('SQL Run Error:', err)
    return null
  }
}

// Initialize ZAI client (lazy)
let zaiClient: any = null
async function getZaiClient() {
  if (!zaiClient) {
    zaiClient = await ZAI.create()
  }
  return zaiClient
}

// ==========================================
// HANDLER: Generate Article
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

  // Parse JSON from LLM response
  let jsonStr = rawText.trim()
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  let parsed: any
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { error: 'Failed to parse AI response as JSON', raw: rawText.slice(0, 200) }
  }

  // Step 3: Generate slug
  const slug = toSlug(parsed.title || 'untitled')
  let finalSlug = slug
  const existingSlug = runQuery('SELECT id FROM NewsItem WHERE slug = ?', [finalSlug])
  if (existingSlug.length > 0) finalSlug = `${slug}-${Date.now()}`

  // Step 4: Get existing articles for internal links
  const existingArticles = runQuery(
    'SELECT slug, title, category, tags, league FROM NewsItem ORDER BY createdAt DESC LIMIT 20'
  )

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
        const { writeFileSync, mkdirSync } = await import('fs')
        const generatedDir = join(dirname(fileURLToPath(import.meta.url)), '../../../public/generated')
        mkdirSync(generatedDir, { recursive: true })
        const filename = `${finalSlug}-${Date.now()}.png`
        const filePath = join(generatedDir, filename)
        writeFileSync(filePath, Buffer.from(imageBase64, 'base64'))
        imageUrl = `/generated/${filename}`
      }
    } catch (imgError) {
      console.error('Image generation failed (non-blocking):', imgError)
    }
  }

  // Step 6: Save to database
  const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const tagsJson = JSON.stringify(articleTags)

  runRun(
    `INSERT INTO NewsItem (id, title, slug, summary, content, category, imageUrl, source, tags, seoTitle, seoDescription, keywords, league, matchId, isAiGenerated, publishedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      (parsed.title || 'Untitled').slice(0, 60),
      finalSlug,
      (parsed.summary || '').slice(0, 155),
      content,
      category || 'Breaking',
      imageUrl,
      'GOALZONE AI',
      tagsJson,
      (parsed.seoTitle || parsed.title || '').slice(0, 60),
      (parsed.seoDescription || parsed.summary || '').slice(0, 155),
      parsed.keywords || '',
      parsed.league || league || '',
      null,
      1, // isAiGenerated = true
      now,
      now,
      now,
    ]
  )

  // Step 7: Create internal links
  for (const related of relatedArticles.slice(0, 3)) {
    if (related.slug) {
      try {
        runRun(
          `INSERT OR IGNORE INTO InternalLink (id, sourceSlug, targetSlug, anchorText, createdAt) VALUES (?, ?, ?, ?, ?)`,
          [`il_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, finalSlug, related.slug, related.title, now]
        )
      } catch { /* skip duplicates */ }
    }
  }

  // Step 8: Activity log
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    runRun(
      `INSERT INTO ActivityLog (id, userId, action, resource, resourceId, details, ip, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, null, 'generate', 'article', id, JSON.stringify({ title: parsed.title, method: 'ai-service', hasImage: !!imageUrl }), '', now]
    )
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
async function handleTrending(): Promise<any> {
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
  const now = new Date().toISOString()
  const createdTopics = []
  for (const topic of topics) {
    try {
      const existing = runQuery('SELECT id FROM TrendingTopic WHERE keyword = ?', [topic.keyword])
      if (existing.length === 0) {
        const id = `tt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        runRun(
          'INSERT INTO TrendingTopic (id, keyword, source, volume, category, region, isProcessed, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, topic.keyword, topic.source, topic.volume, topic.category, 'global', 0, now, now]
        )
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
// HANDLER: Send Telegram Message
// ==========================================
async function handleTelegram(body: any): Promise<any> {
  const { newsId, chatId, message } = body
  let finalMessage = message || ''
  let finalChatId = chatId || process.env.TELEGRAM_CHAT_ID || ''

  if (newsId) {
    const articles = runQuery('SELECT * FROM NewsItem WHERE id = ?', [newsId])
    if (articles.length === 0) return { error: 'Article not found' }
    const article = articles[0]
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://goalzone.app'
    finalMessage = `⚽ *${article.title}*\n\n${article.summary}\n\n🔗 ${siteUrl}/news/${article.slug || article.id}`
  }

  if (!finalMessage) return { error: 'message or newsId is required' }

  const now = new Date().toISOString()
  const postId = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  // Save to database
  runRun(
    'INSERT INTO TelegramPost (id, newsId, chatId, message, status, error, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [postId, newsId || null, finalChatId, finalMessage, 'pending', '', now, now]
  )

  // Try to send via Telegram Bot API
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (botToken && finalChatId) {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
      const telegramResponse = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: finalChatId, text: finalMessage, parse_mode: 'Markdown' }),
      })
      const telegramResult = await telegramResponse.json() as any

      if (telegramResult.ok) {
        runRun("UPDATE TelegramPost SET status = 'sent', sentAt = ? WHERE id = ?", [now, postId])
      } else {
        runRun("UPDATE TelegramPost SET status = 'failed', error = ? WHERE id = ?", [telegramResult.description || 'Unknown error', postId])
      }

      return {
        success: telegramResult.ok,
        post: { id: postId, status: telegramResult.ok ? 'sent' : 'failed', message: finalMessage },
      }
    } catch {
      runRun("UPDATE TelegramPost SET status = 'failed', error = 'API unavailable' WHERE id = ?", [postId])
      return { success: false, post: { id: postId, status: 'failed', message: finalMessage, error: 'API unavailable' } }
    }
  }

  return {
    success: false,
    post: { id: postId, status: 'pending', message: finalMessage, note: 'Bot not configured' },
  }
}

// ==========================================
// HANDLER: Get Trending Topics
// ==========================================
function handleGetTrending(): any {
  const topics = runQuery('SELECT * FROM TrendingTopic ORDER BY volume DESC LIMIT 20')
  return { topics }
}

// ==========================================
// HANDLER: Get Scheduled Tasks
// ==========================================
function handleGetSchedule(): any {
  const tasks = runQuery('SELECT * FROM ScheduledTask ORDER BY createdAt DESC')
  return { tasks }
}

// ==========================================
// HTTP Server
// ==========================================
const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Parse URL
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const pathname = url.pathname
  const action = url.searchParams.get('action') || ''

  try {
    // Route: Health check
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'goalzone-ai', port: PORT }))
      return
    }

    // Route: Generate article
    if (pathname === '/generate' && req.method === 'POST') {
      let body: any = {}
      try { body = await parseBody(req) } catch { /* empty body */ }

      console.log(`[AI] Generating article: topic="${body.topic || 'auto'}" category="${body.category || 'Breaking'}"`)
      const result = await handleGenerate(body)
      console.log(`[AI] Article generated: "${result.article?.title || 'FAILED'}" in ${result.meta?.generationTime || 0}ms`)

      res.writeHead(result.error ? 500 : 201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // Route: Trending
    if (pathname === '/trending' && req.method === 'POST') {
      const result = await handleTrending()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // Route: Get trending
    if (pathname === '/trending' && req.method === 'GET') {
      const result = handleGetTrending()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // Route: Telegram
    if (pathname === '/telegram' && req.method === 'POST') {
      let body: any = {}
      try { body = await parseBody(req) } catch { /* empty body */ }
      const result = await handleTelegram(body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // Route: TikTok Script
    if (pathname === '/tiktok-script' && req.method === 'POST') {
      let body: any = {}
      try { body = await parseBody(req) } catch { /* empty body */ }

      const { topic } = body
      let scriptTopic = topic
      if (!scriptTopic) {
        const trending = runQuery("SELECT keyword FROM TrendingTopic WHERE isProcessed = 0 ORDER BY volume DESC LIMIT 1")
        scriptTopic = trending[0]?.keyword || 'football highlights'
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
      let jsonStr = rawText.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      jsonStr = jsonStr.trim()

      let parsed: any
      try { parsed = JSON.parse(jsonStr) } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ topic: scriptTopic, script: rawText, note: 'AI response was not valid JSON' }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ topic: scriptTopic, ...parsed }))
      return
    }

    // Route: Schedule
    if (pathname === '/schedule' && req.method === 'GET') {
      const result = handleGetSchedule()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (error) {
    console.error('[AI] Error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error', details: String(error) }))
  }
})

// Helper: parse request body
function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: string) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

server.listen(PORT, () => {
  console.log(`🤖 GOALZONE AI Service running on port ${PORT}`)
  console.log(`   Database: ${DB_PATH}`)
  console.log(`   Endpoints:`)
  console.log(`     POST /generate    - Generate AI article`)
  console.log(`     POST /trending    - Scrape trending topics`)
  console.log(`     GET  /trending    - Get trending topics`)
  console.log(`     POST /telegram    - Send Telegram message`)
  console.log(`     GET  /schedule    - Get scheduled tasks`)
  console.log(`     GET  /health      - Health check`)
})
