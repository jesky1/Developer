import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import { safeNewsFindFirst, safeNewsCount, safeNewsFindMany, safeNewsFindUnique } from '@/lib/safe-query'

// --- Constants ---

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

const SEARCH_QUERIES = [
  'berita bola terkini hari ini',
  'transfer pemain sepak bola terbaru',
  'liga 1 Indonesia berita',
  'premier league berita hari ini',
  'hasil pertandingan sepak bola terbaru',
  'berita liga champions terkini',
  'berita Serie A La Liga Bundesliga terbaru',
]

const CATEGORIES = [
  'Breaking',
  'Transfer',
  'Liga 1',
  'Liga Inggris',
  'Liga Spanyol',
  'Liga Italia',
  'Liga Jerman',
  'Liga Champions',
  'Analisis',
  'Prediksi',
]

const LEAGUE_MAP: Record<string, string> = {
  'Liga 1': 'Liga 1 Indonesia',
  'Liga Inggris': 'Premier League',
  'Liga Spanyol': 'La Liga',
  'Liga Italia': 'Serie A',
  'Liga Jerman': 'Bundesliga',
  'Liga Champions': 'UEFA Champions League',
}

// Category-specific Pexels search terms for better image relevance
const PEXELS_SEARCH_MAP: Record<string, string[]> = {
  'Breaking': ['football stadium crowd', 'soccer match celebration', 'football goal moment'],
  'Transfer': ['football player portrait', 'soccer player jersey', 'football contract signing'],
  'Liga 1': ['Indonesian football stadium', 'Liga 1 Indonesia soccer', 'football match Indonesia'],
  'Liga Inggris': ['Premier League stadium', 'English football match', 'Premier League crowd'],
  'Liga Spanyol': ['La Liga stadium', 'Spanish football match', 'Camp Nou stadium'],
  'Liga Italia': ['Serie A stadium', 'Italian football match', 'San Siro stadium'],
  'Liga Jerman': ['Bundesliga stadium', 'German football crowd', 'dortmund signal iduna'],
  'Liga Champions': ['Champions League trophy', 'UEFA Champions League stadium', 'Champions League final'],
  'Analisis': ['football tactics board', 'soccer strategy', 'football coach tactics'],
  'Prediksi': ['football prediction', 'soccer betting odds', 'football match preview'],
}

const SYSTEM_PROMPT = `Kamu adalah jurnalis olahraga profesional yang menulis berita sepak bola dalam Bahasa Indonesia. Tugasmu adalah menulis artikel berita sepak bola yang SEO-friendly, menarik, dan informatif.

Kamu HARUS merespon dalam format JSON berikut:
{
  "title": "Judul artikel yang SEO-friendly (maks 60 karakter)",
  "seoTitle": "Title tag SEO (maks 60 karakter)",
  "seoDescription": "Meta description SEO (maks 155 karakter)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "summary": "Ringkasan artikel 2-3 kalimat yang menarik (maks 160 karakter)",
  "content": "Konten artikel lengkap 400-600 kata dalam Bahasa Indonesia, ditulis dengan gaya jurnalistik yang menarik. Gunakan paragraf yang terpisah dengan newline.",
  "category": "Kategori artikel",
  "tags": ["tag1", "tag2", "tag3"],
  "league": "Liga terkait",
  "imageAlt": "Deskripsi gambar dalam Bahasa Indonesia yang detail untuk aksesibilitas dan SEO (maks 125 karakter). Jelaskan apa yang terlihat di gambar."
}

PENTING:
- Tulis dalam Bahasa Indonesia yang natural dan menarik
- Gunakan keyword yang relevan untuk SEO
- Judul harus catchy dan mengandung keyword utama
- Konten harus informatif, terstruktur, dan mudah dibaca
- Sertakan nama pemain, klub, dan detail pertandingan jika tersedia
- imageAlt harus deskriptif: contoh "Pemain Manchester City merayakan gol di Etihad Stadium saat melawan Arsenal"
- Hindari konten duplikat atau plagiarisme — tulis dengan gaya orisinal

Kategori yang tersedia: Breaking, Transfer, Liga 1, Liga Inggris, Liga Spanyol, Liga Italia, Liga Jerman, Liga Champions, Analisis, Prediksi

PENTING UNTUK ADSENSE:
- Jangan gunakan bahasa yang terlalu sensasional atau clickbait berlebihan
- Hindari klaim yang tidak dapat diverifikasi
- Gunakan sumber yang kredibel
- Konten harus informatif dan bermanfaat bagi pembaca`

// --- Helpers ---

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

interface GeneratedArticle {
  title: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  summary: string
  content: string
  category: string
  tags: string[]
  league: string
  imageAlt: string
}

function parseArticleResponse(raw: string): GeneratedArticle | null {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    const required = ['title', 'seoTitle', 'seoDescription', 'seoKeywords', 'summary', 'content', 'category', 'tags', 'league']
    for (const field of required) {
      if (!parsed[field]) {
        console.warn(`Missing field in LLM response: ${field}`)
        return null
      }
    }

    // Ensure seoKeywords and tags are arrays
    if (!Array.isArray(parsed.seoKeywords)) parsed.seoKeywords = []
    if (!Array.isArray(parsed.tags)) parsed.tags = []

    // Generate imageAlt if not provided by LLM
    if (!parsed.imageAlt) {
      parsed.imageAlt = `${parsed.league || 'Sepak bola'} - ${parsed.title}`
    }

    return parsed as GeneratedArticle
  } catch (err) {
    console.error('Failed to parse LLM article response:', err)
    console.error('Raw response:', raw.slice(0, 500))
    return null
  }
}

// --- Pexels Image Fetcher ---

interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  alt: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
  }
}

interface PexelsSearchResult {
  photos: PexelsPhoto[]
  total_results: number
  page: number
  per_page: number
}

async function fetchPexelsImage(query: string): Promise<{
  imageUrl: string
  imageAlt: string
  imageWidth: number
  imageHeight: number
  imageSource: string
  photographerUrl: string
} | null> {
  // Try Pexels API first (if key available)
  if (PEXELS_API_KEY) {
    try {
      console.log(`[Pexels] Searching for: "${query}"`)
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`
      const response = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY },
        cache: 'no-store' as RequestInit['cache'],
      })

      if (!response.ok) {
        console.warn(`[Pexels] API returned ${response.status}`)
      } else {
        const data: PexelsSearchResult = await response.json()
        if (data.photos && data.photos.length > 0) {
          // Pick a random photo from top 5 results for variety
          const photo = data.photos[Math.floor(Math.random() * Math.min(3, data.photos.length))]
          console.log(`[Pexels] Found photo: ${photo.id} by ${photo.photographer}`)

          // Download the large image and save locally
          const timestamp = Date.now()
          const filename = `pexels-${photo.id}-${timestamp}.jpg`
          const imagesDir = path.join(process.cwd(), 'public', 'news-images')
          ensureDir(imagesDir)

          const imagePath = path.join(imagesDir, filename)
          const imageResponse = await fetch(photo.src.large, { cache: 'no-store' as RequestInit['cache'] })
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            fs.writeFileSync(imagePath, buffer)

            const localUrl = `/news-images/${filename}`
            const alt = photo.alt || `${query} - foto oleh ${photo.photographer}`

            return {
              imageUrl: localUrl,
              imageAlt: alt,
              imageWidth: photo.width,
              imageHeight: photo.height,
              imageSource: `Pexels - ${photo.photographer}`,
              photographerUrl: photo.photographer ? `https://www.pexels.com/@${photo.photographer.toLowerCase().replace(/\s+/g, '-')}` : '',
            }
          }
        }
      }
    } catch (err) {
      console.error('[Pexels] API error:', err)
    }
  }

  // Fallback: Use z-ai-web-dev-sdk web search to find a relevant image
  try {
    console.log('[ImageFallback] Using web search to find images...')
    const zai = await ZAI.create()
    const searchResults = await zai.functions.invoke('web_search', {
      query: `${query} football soccer image photo`,
      num: 5,
    })

    if (searchResults && searchResults.length > 0) {
      // Find a result that looks like an image URL
      for (const result of searchResults) {
        const url = result.url || ''
        if (url.match(/\.(jpg|jpeg|png|webp)/i)) {
          return {
            imageUrl: url,
            imageAlt: `${query} - sepak bola`,
            imageWidth: 1344,
            imageHeight: 768,
            imageSource: result.host_name || 'Web',
            photographerUrl: '',
          }
        }
      }
    }
  } catch (err) {
    console.error('[ImageFallback] Web search error:', err)
  }

  // Last fallback: Use AI image generation
  try {
    console.log('[ImageFallback] Using AI image generation...')
    const zai = await ZAI.create()
    const imagePrompt = `Professional sports photography: ${query}, dynamic football stadium atmosphere, dramatic lighting, wide angle shot, high quality sports journalism photo`
    const imageResponse = await zai.images.generations.create({
      prompt: imagePrompt,
      size: '1344x768',
    })

    if (imageResponse.data && imageResponse.data.length > 0 && imageResponse.data[0].base64) {
      const timestamp = Date.now()
      const filename = `ai-${timestamp}.png`
      const imagesDir = path.join(process.cwd(), 'public', 'news-images')
      ensureDir(imagesDir)

      const imagePath = path.join(imagesDir, filename)
      const imageBuffer = Buffer.from(imageResponse.data[0].base64, 'base64')
      fs.writeFileSync(imagePath, imageBuffer)

      return {
        imageUrl: `/news-images/${filename}`,
        imageAlt: `${query} - ilustrasi sepak bola`,
        imageWidth: 1344,
        imageHeight: 768,
        imageSource: 'AI Generated',
        photographerUrl: '',
      }
    }
  } catch (err) {
    console.error('[ImageFallback] AI generation error:', err)
  }

  return null
}

// --- GET: Auto-generation status ---

export async function GET() {
  try {
    const lastArticle = await safeNewsFindFirst(db, {
      where: { isAiGenerated: true },
      orderBy: { createdAt: 'desc' },
    })
    const totalAiArticles = await safeNewsCount(db, {
      where: { isAiGenerated: true },
    })
    const totalArticles = await safeNewsCount(db)
    const totalHeadlines = await safeNewsCount(db, {
      where: { isHeadline: true },
    })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const articlesToday = await safeNewsCount(db, {
      where: { createdAt: { gte: todayStart } },
    })

    return NextResponse.json({
      lastGeneration: lastArticle?.createdAt ?? null,
      lastArticleTitle: lastArticle?.title ?? null,
      lastArticleId: lastArticle?.id ?? null,
      totalAiArticles,
      totalArticles,
      totalHeadlines,
      articlesToday,
      availableCategories: CATEGORIES,
      pexelsConfigured: !!PEXELS_API_KEY,
    })
  } catch (error) {
    console.error('Error fetching auto-generation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auto-generation status' },
      { status: 500 }
    )
  }
}

// --- POST: Auto-generate news article ---

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedCategory = searchParams.get('category')

    // Determine category
    const category = requestedCategory && CATEGORIES.includes(requestedCategory)
      ? requestedCategory
      : pickRandom(CATEGORIES)

    // Select search query based on category or randomly
    const searchQuery = getSearchQueryForCategory(category)

    // Step 1: Web search for latest football news
    console.log(`[AutoGenerate] Searching: "${searchQuery}" for category: ${category}`)
    const zai = await ZAI.create()

    const searchResults = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 10,
      recency_days: 1,
    })

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json(
        { error: 'No search results found. Try again later.', category },
        { status: 404 }
      )
    }

    // Format search results for the LLM
    const searchContext = searchResults
      .slice(0, 6)
      .map((r: { name: string; host_name: string; snippet: string; url: string }, i: number) => `[${i + 1}] ${r.name}\nSumber: ${r.host_name}\n${r.snippet}\nURL: ${r.url}`)
      .join('\n\n')

    // Step 2: Deduplication check - skip if similar title exists in last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentArticles = await safeNewsFindMany(db, {
      where: { createdAt: { gte: twoHoursAgo } },
    })
    const recentTitles = recentArticles.map((a) => a.title.toLowerCase())

    // Step 3: LLM rewrite into SEO-optimized article with imageAlt
    console.log('[AutoGenerate] Generating article with LLM...')

    const userPrompt = `Berikut adalah hasil pencarian berita sepak bola terkini:

${searchContext}

Kategori yang diminta: ${category}

Berdasarkan informasi di atas, tulis artikel berita sepak bola yang SEO-friendly, menarik, dan informatif dalam Bahasa Indonesia. Pastikan:
1. Judul mengandung keyword utama dan catchy (MAKS 60 karakter)
2. Konten 400-600 kata dengan paragraf yang terstruktur
3. Sertakan detail seperti nama pemain, klub, skor jika tersedia
4. Gunakan bahasa Indonesia yang natural dan jurnalistik
5. Pilih kategori yang paling sesuai dari daftar: ${CATEGORIES.join(', ')}
6. imageAlt harus deskriptif dalam Bahasa Indonesia, jelaskan adegan yang relevan dengan artikel
7. Hindari konten clickbait atau klaim yang tidak terverifikasi (penting untuk AdSense)
8. Pastikan konten orisinal, bukan copy-paste dari sumber`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const rawResponse = completion.choices[0]?.message?.content
    if (!rawResponse) {
      return NextResponse.json(
        { error: 'LLM returned empty response', category },
        { status: 500 }
      )
    }

    const article = parseArticleResponse(rawResponse)
    if (!article) {
      return NextResponse.json(
        { error: 'Failed to parse LLM article response', category },
        { status: 500 }
      )
    }

    // Deduplication: check if title is too similar to recent articles
    const articleTitleLower = article.title.toLowerCase()
    const isDuplicate = recentTitles.some(
      (existing) =>
        existing.includes(articleTitleLower.slice(0, 30)) ||
        articleTitleLower.includes(existing.slice(0, 30))
    )
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Similar article already exists in the last 2 hours', category },
        { status: 409 }
      )
    }

    // Step 4: Fetch relevant image from Pexels
    console.log('[AutoGenerate] Fetching relevant image from Pexels...')
    const pexelsQuery = pickRandom(PEXELS_SEARCH_MAP[category] || ['football soccer match'])
    let imageUrl = ''
    let imageAlt = article.imageAlt || `${article.league || 'Sepak bola'} - ${article.title}`
    let imageWidth = 0
    let imageHeight = 0
    let imageSource = ''

    const imageResult = await fetchPexelsImage(pexelsQuery)
    if (imageResult) {
      imageUrl = imageResult.imageUrl
      imageAlt = imageResult.imageAlt
      imageWidth = imageResult.imageWidth
      imageHeight = imageResult.imageHeight
      imageSource = imageResult.imageSource
      console.log(`[AutoGenerate] Image: ${imageUrl} (${imageSource})`)
    } else {
      console.log('[AutoGenerate] No image available, continuing without image')
    }

    // Step 5: Generate slug with uniqueness check
    const slug = toSlug(article.title)
    let finalSlug = slug
    try {
      const existing = await safeNewsFindUnique(db, { where: { slug: finalSlug } })
      if (existing) finalSlug = `${slug}-${Date.now()}`
    } catch {
      finalSlug = `${slug}-${Date.now()}`
    }

    // Step 6: Determine if this should be headline
    const isHeadline = article.category === 'Breaking'

    // Step 7: Map league
    const league = article.league || LEAGUE_MAP[article.category] || article.category

    // Step 8: Save to database with full SEO + image data
    console.log('[AutoGenerate] Saving article to database...')
    const savedArticle = await db.newsItem.create({
      data: {
        title: article.title,
        slug: finalSlug,
        summary: article.summary,
        content: article.content,
        category: article.category,
        imageUrl,
        imageAlt,
        imageWidth,
        imageHeight,
        imageSource,
        source: 'GOALZONE AI',
        sourceUrl: searchResults[0]?.url || '',
        tags: JSON.stringify(article.tags),
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        seoKeywords: JSON.stringify(article.seoKeywords),
        league,
        isAiGenerated: true,
        isHeadline,
        isPublished: true,
        language: 'id',
        viewCount: 0,
      },
    })

    console.log(`[AutoGenerate] Article saved: ${savedArticle.id} - ${savedArticle.title}`)
    console.log(`[AutoGenerate] Image: ${imageUrl} | Alt: ${imageAlt} | Source: ${imageSource}`)

    return NextResponse.json({
      success: true,
      article: {
        id: savedArticle.id,
        title: savedArticle.title,
        slug: savedArticle.slug,
        summary: savedArticle.summary,
        category: savedArticle.category,
        imageUrl: savedArticle.imageUrl,
        imageAlt: savedArticle.imageAlt,
        imageWidth: savedArticle.imageWidth,
        imageHeight: savedArticle.imageHeight,
        imageSource: savedArticle.imageSource,
        source: savedArticle.source,
        sourceUrl: savedArticle.sourceUrl,
        tags: article.tags,
        seoTitle: savedArticle.seoTitle,
        seoDescription: savedArticle.seoDescription,
        seoKeywords: article.seoKeywords,
        league: savedArticle.league,
        isHeadline: savedArticle.isHeadline,
        isAiGenerated: savedArticle.isAiGenerated,
        publishedAt: savedArticle.publishedAt,
        createdAt: savedArticle.createdAt,
      },
      meta: {
        searchQuery,
        searchResultsCount: searchResults.length,
        category,
        imageSource: imageSource || 'none',
      },
    })
  } catch (error) {
    console.error('[AutoGenerate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-generate news article' },
      { status: 500 }
    )
  }
}

// --- Helper: Map category to search query ---

function getSearchQueryForCategory(category: string): string {
  const categoryQueryMap: Record<string, string[]> = {
    'Breaking': ['berita bola terkini hari ini', 'hasil pertandingan sepak bola terbaru'],
    'Transfer': ['transfer pemain sepak bola terbaru', 'berita bola terkini hari ini'],
    'Liga 1': ['liga 1 Indonesia berita', 'berita bola terkini hari ini'],
    'Liga Inggris': ['premier league berita hari ini', 'hasil pertandingan sepak bola terbaru'],
    'Liga Spanyol': ['berita Serie A La Liga Bundesliga terbaru', 'premier league berita hari ini'],
    'Liga Italia': ['berita Serie A La Liga Bundesliga terbaru', 'berita bola terkini hari ini'],
    'Liga Jerman': ['berita Serie A La Liga Bundesliga terbaru', 'hasil pertandingan sepak bola terbaru'],
    'Liga Champions': ['berita liga champions terkini', 'hasil pertandingan sepak bola terbaru'],
    'Analisis': ['berita bola terkini hari ini', 'premier league berita hari ini'],
    'Prediksi': ['hasil pertandingan sepak bola terbaru', 'berita liga champions terkini'],
  }

  const queries = categoryQueryMap[category] || SEARCH_QUERIES
  return pickRandom(queries)
}
