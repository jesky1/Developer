import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

// --- Constants ---

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

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

const SEARCH_QUERIES = [
  'berita bola terkini hari ini',
  'transfer pemain sepak bola terbaru',
  'liga 1 Indonesia berita',
  'premier league berita hari ini',
  'hasil pertandingan sepak bola terbaru',
  'berita liga champions terkini',
  'berita Serie A La Liga Bundesliga terbaru',
]

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

    const required = ['title', 'seoTitle', 'seoDescription', 'seoKeywords', 'summary', 'content', 'category', 'tags', 'league']
    for (const field of required) {
      if (!parsed[field]) {
        console.warn(`Missing field in LLM response: ${field}`)
        return null
      }
    }

    if (!Array.isArray(parsed.seoKeywords)) parsed.seoKeywords = []
    if (!Array.isArray(parsed.tags)) parsed.tags = []

    if (!parsed.imageAlt) {
      parsed.imageAlt = `${parsed.league || 'Sepak bola'} - ${parsed.title}`
    }

    return parsed as GeneratedArticle
  } catch (err) {
    console.error('Failed to parse LLM article response:', err)
    return null
  }
}

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
} | null> {
  if (PEXELS_API_KEY) {
    try {
      console.log(`[BatchGenerate] Pexels searching: "${query}"`)
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`
      const response = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY },
        cache: 'no-store' as RequestInit['cache'],
      })

      if (response.ok) {
        const data: PexelsSearchResult = await response.json()
        if (data.photos && data.photos.length > 0) {
          const photo = data.photos[Math.floor(Math.random() * Math.min(3, data.photos.length))]

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

            return {
              imageUrl: `/news-images/${filename}`,
              imageAlt: photo.alt || `${query} - foto oleh ${photo.photographer}`,
              imageWidth: photo.width,
              imageHeight: photo.height,
              imageSource: `Pexels - ${photo.photographer}`,
            }
          }
        }
      }
    } catch (err) {
      console.error('[BatchGenerate] Pexels API error:', err)
    }
  }

  // Fallback: AI image generation
  try {
    console.log('[BatchGenerate] Using AI image generation...')
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
      }
    }
  } catch (err) {
    console.error('[BatchGenerate] AI image generation error:', err)
  }

  return null
}

// --- Generate single article (full pipeline) ---

async function generateSingleArticle(category?: string): Promise<{
  success: boolean
  article?: {
    id: string
    title: string
    slug: string
    category: string
    imageUrl: string
    imageSource: string
    createdAt: Date
  }
  error?: string
}> {
  try {
    // Determine category
    const selectedCategory = category && CATEGORIES.includes(category)
      ? category
      : pickRandom(CATEGORIES)

    const searchQuery = getSearchQueryForCategory(selectedCategory)

    // Step 1: Web search
    console.log(`[BatchGenerate] Searching: "${searchQuery}" for category: ${selectedCategory}`)
    const zai = await ZAI.create()

    const searchResults = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 10,
      recency_days: 1,
    })

    if (!searchResults || searchResults.length === 0) {
      return { success: false, error: `No search results for category ${selectedCategory}` }
    }

    // Format search results for LLM
    const searchContext = searchResults
      .slice(0, 6)
      .map((r: { name: string; host_name: string; snippet: string; url: string }, i: number) => `[${i + 1}] ${r.name}\nSumber: ${r.host_name}\n${r.snippet}\nURL: ${r.url}`)
      .join('\n\n')

    // Step 2: Deduplication check
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentArticles = await db.newsItem.findMany({
      where: { createdAt: { gte: twoHoursAgo } },
      select: { title: true },
    })
    const recentTitles = recentArticles.map((a) => a.title.toLowerCase())

    // Step 3: LLM rewrite
    console.log('[BatchGenerate] Generating article with LLM...')

    const userPrompt = `Berikut adalah hasil pencarian berita sepak bola terkini:

${searchContext}

Kategori yang diminta: ${selectedCategory}

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
      return { success: false, error: 'LLM returned empty response' }
    }

    const article = parseArticleResponse(rawResponse)
    if (!article) {
      return { success: false, error: 'Failed to parse LLM article response' }
    }

    // Deduplication check
    const articleTitleLower = article.title.toLowerCase()
    const isDuplicate = recentTitles.some(
      (existing) =>
        existing.includes(articleTitleLower.slice(0, 30)) ||
        articleTitleLower.includes(existing.slice(0, 30))
    )
    if (isDuplicate) {
      return { success: false, error: 'Similar article already exists in the last 2 hours' }
    }

    // Step 4: Fetch image
    console.log('[BatchGenerate] Fetching image...')
    const pexelsQuery = pickRandom(PEXELS_SEARCH_MAP[selectedCategory] || ['football soccer match'])
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
    }

    // Step 5: Generate slug
    const slug = toSlug(article.title)
    let finalSlug = slug
    try {
      const existing = await db.newsItem.findUnique({ where: { slug: finalSlug } })
      if (existing) finalSlug = `${slug}-${Date.now()}`
    } catch {
      finalSlug = `${slug}-${Date.now()}`
    }

    // Step 6: Determine headline
    const isHeadline = article.category === 'Breaking'

    // Step 7: Map league
    const league = article.league || LEAGUE_MAP[article.category] || article.category

    // Step 8: Save to database
    console.log('[BatchGenerate] Saving article to database...')
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

    console.log(`[BatchGenerate] Article saved: ${savedArticle.id} - ${savedArticle.title}`)

    return {
      success: true,
      article: {
        id: savedArticle.id,
        title: savedArticle.title,
        slug: savedArticle.slug,
        category: savedArticle.category,
        imageUrl: savedArticle.imageUrl,
        imageSource: savedArticle.imageSource,
        createdAt: savedArticle.createdAt,
      },
    }
  } catch (error) {
    console.error('[BatchGenerate] Error generating article:', error)
    return { success: false, error: 'Failed to generate article' }
  }
}

// POST - Batch generate articles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const count = Math.min(Math.max(body.count || 1, 1), 5)
    const category = body.category

    const results: {
      success: boolean
      article?: {
        id: string
        title: string
        slug: string
        category: string
        imageUrl: string
        imageSource: string
        createdAt: Date
      }
      error?: string
    }[] = []

    // Process sequentially to avoid API rate limits
    for (let i = 0; i < count; i++) {
      console.log(`[BatchGenerate] Generating article ${i + 1} of ${count}...`)
      const result = await generateSingleArticle(category)
      results.push(result)
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      totalRequested: count,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('[BatchGenerate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to batch generate articles' },
      { status: 500 }
    )
  }
}
