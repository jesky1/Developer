import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { searchFootballImage, isPexelsConfigured } from '@/lib/pexels-api'
import { isRealDataMode } from '@/lib/football-api'

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

function matchCategory(match: { status: string; isHot: boolean; homeScore: number; awayScore: number }): string {
  const hasGoals = match.homeScore > 0 || match.awayScore > 0
  if (match.status === 'LIVE' && hasGoals) return 'Breaking'
  if (match.status === 'FT') return 'Match Report'
  if (match.isHot) return 'Analysis'
  if (match.status === 'LIVE') return 'Breaking'
  return 'Match Report'
}

// --- Generate article using LLM (z-ai-web-dev-sdk) ---
async function generateArticleWithLLM(match: {
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  status: string; minute: number; league: string; events: string; isHot: boolean; stadium: string
}, category: string): Promise<{
  title: string
  summary: string
  content: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  keywords: string
  imageAlt: string
} | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const client = await ZAI.create()

    const events: { type: string; team: string; player: string; minute: number }[] = (() => {
      try { return JSON.parse(match.events) } catch { return [] }
    })()

    const goalScorers = events.filter(e => e.type === 'goal').map(e => `${e.player} (${e.minute}')`).join(', ')
    const yellowCards = events.filter(e => e.type === 'yellow').length
    const redCards = events.filter(e => e.type === 'red').length

    const prompt = `Tulis artikel berita sepak bola berdasarkan data pertandingan berikut:

Pertandingan: ${match.homeTeam} vs ${match.awayTeam}
Skor: ${match.homeScore} - ${match.awayScore}
Liga: ${match.league}
Status: ${match.status === 'LIVE' ? `LIVE (${match.minute}')` : match.status}
Stadion: ${match.stadium || 'N/A'}
Pencetak Gol: ${goalScorers || 'Belum ada gol'}
Kartu Kuning: ${yellowCards}
Kartu Merah: ${redCards}
Kategori: ${category}

WAJIB output dalam format JSON persis seperti ini:
{
  "title": "Judul artikel max 60 karakter, menarik & SEO-friendly",
  "summary": "Ringkasan artikel max 155 karakter, mengandung keyword utama",
  "content": "Konten artikel 3-5 paragraf, masing-masing 2-3 kalimat. Tulis dalam bahasa Indonesia yang baik. Sertakan analisis singkat dan konteks liga.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoTitle": "SEO title max 60 karakter",
  "seoDescription": "SEO description max 155 karakter, mengandung keyword",
  "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
  "imageAlt": "Alt text deskriptif untuk gambar pertandingan, max 120 karakter"
}

PENTING:
- Artikel harus ORISINIL, tidak menyalin sumber manapun
- Gunakan bahasa Indonesia yang natural dan menarik
- Sertakan nama pemain, skor, dan konteks liga
- Optimasi untuk SEO tapi tetap natural
- Jangan gunakan tanda kutip berlebihan`

    const response = await client.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'assistant', content: 'Kamu adalah jurnalis olahraga profesional yang menulis berita sepak bola berkualitas tinggi untuk GOALZONE. Kamu menguasai SEO dan selalu menghasilkan konten orisinal.' },
        { role: 'user', content: prompt },
      ],
    })

    const rawText = response.choices?.[0]?.message?.content ?? ''

    // Parse JSON dari response LLM
    let jsonStr = rawText.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const parsed = JSON.parse(jsonStr)

    return {
      title: (parsed.title || '').slice(0, 60),
      summary: (parsed.summary || '').slice(0, 155),
      content: parsed.content || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
      seoTitle: (parsed.seoTitle || parsed.title || '').slice(0, 60),
      seoDescription: (parsed.seoDescription || parsed.summary || '').slice(0, 155),
      keywords: parsed.keywords || '',
      imageAlt: (parsed.imageAlt || '').slice(0, 120),
    }
  } catch (error) {
    console.error('LLM generation error, falling back to template:', error)
    return null
  }
}

// --- Template-based fallback (no LLM) ---
function generateArticleFromTemplate(match: {
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  status: string; minute: number; league: string; events: string; isHot: boolean; stadium: string
}, category: string) {
  const events: { type: string; team: string; player: string; minute: number }[] = (() => {
    try { return JSON.parse(match.events) } catch { return [] }
  })()

  const goalEvents = events.filter(e => e.type === 'goal')
  const winner = match.homeScore > match.awayScore ? match.homeTeam : match.awayScore > match.homeScore ? match.awayTeam : null
  const isDraw = match.homeScore === match.awayScore

  let title = ''
  if (category === 'Breaking') {
    title = goalEvents.length > 0
      ? `${goalEvents[goalEvents.length - 1].player} Strikes as ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`
      : `${match.homeTeam} vs ${match.awayTeam}: Goal Updates - ${match.league}`
  } else if (category === 'Match Report') {
    title = isDraw
      ? `${match.homeTeam} and ${match.awayTeam} Share Spoils in ${match.homeScore}-${match.awayScore} Draw`
      : `${winner} Secure Victory in ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`
  } else {
    title = `${match.homeTeam} vs ${match.awayTeam}: Tactical Analysis - ${match.league}`
  }

  const summary = isDraw
    ? `${match.homeTeam} dan ${match.awayTeam} bermain imbang ${match.homeScore}-${match.awayScore} di ${match.league}. Baca laporan pertandingan lengkap.`
    : `${winner} menang ${match.homeScore}-${match.awayScore} atas ${winner === match.homeTeam ? match.awayTeam : match.homeTeam} di ${match.league}.`

  const paragraphs: string[] = []
  paragraphs.push(`${match.homeTeam} berhadapan dengan ${match.awayTeam} di ${match.stadium || 'stadion'} dalam laga ${match.league} yang seru. Pertandingan berakhir ${match.homeScore}-${match.awayScore}${match.status === 'FT' ? '.' : `, sedang berlangsung menit ke-${match.minute}.`}`)

  if (goalEvents.length > 0) {
    paragraphs.push(`Gol pembuka dicetak ${goalEvents[0].player} pada menit ${goalEvents[0].minute}' untuk ${goalEvents[0].team === 'home' ? match.homeTeam : match.awayTeam}. ${goalEvents.length > 1 ? `Gol-gol berikutnya: ${goalEvents.slice(1).map(g => `${g.player} (${g.minute}')`).join(', ')}.` : ''}`)
  }

  paragraphs.push(isDraw
    ? `Hasil imbang ini membuat kedua tim berbagi poin. ${match.homeTeam} akan berusaha meraih kemenangan di laga selanjutnya, sementara ${match.awayTeam} juga punya peluang untuk naik peringkat.`
    : `${winner} akan puas dengan hasil ini saat mereka terus mengejar target musim ini. ${winner === match.homeTeam ? match.awayTeam : match.homeTeam}, di sisi lain, perlu bangkit di pertandingan berikutnya.`)

  const tags = [match.homeTeam, match.awayTeam, match.league, category]
  if (goalEvents.length > 0) tags.push(goalEvents[0].player)
  if (match.isHot) tags.push('Hot Match')

  return {
    title: title.slice(0, 60),
    summary: summary.slice(0, 155),
    content: paragraphs.join('\n\n'),
    category,
    tags: [...new Set(tags)],
    seoTitle: title.slice(0, 60),
    seoDescription: summary.slice(0, 155),
    keywords: `${match.homeTeam}, ${match.awayTeam}, ${match.league}, ${category}, skor, hasil pertandingan`,
    imageAlt: `${match.homeTeam} vs ${match.awayTeam} - ${match.league} | GOALZONE`,
  }
}

// --- Generate Schema.org JSON-LD ---
function generateSchemaOrg(article: {
  title: string
  summary: string
  content: string
  imageUrl: string
  category: string
  league: string
  slug: string
  createdAt: Date
  seoDescription?: string
  keywords?: string
  tags?: string[]
}, match: {
  homeTeam: string
  awayTeam: string
  stadium: string
  kickoff: string
}) {
  const baseUrl = 'https://goalzone-live.vercel.app'
  const articleUrl = `${baseUrl}/berita/${article.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seoDescription || article.summary,
    image: article.imageUrl || undefined,
    datePublished: article.createdAt.toISOString(),
    dateModified: article.createdAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'GOALZONE',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/goalzone-logo.png`,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'GOALZONE',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/goalzone-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    articleSection: article.category,
    keywords: article.keywords || article.tags?.join(', '),
    about: [
      {
        '@type': 'SportsEvent',
        name: `${match.homeTeam} vs ${match.awayTeam}`,
        location: match.stadium ? {
          '@type': 'Place',
          name: match.stadium,
        } : undefined,
        startDate: match.kickoff || undefined,
      },
      {
        '@type': 'Thing',
        name: article.league,
      },
    ],
    isAccessibleForFree: true,
    inLanguage: 'id',
  }
}

// --- GET: generation status ---

export async function GET() {
  try {
    const lastArticle = await db.newsItem.findFirst({
      where: { isAiGenerated: true },
      orderBy: { createdAt: 'desc' },
    })
    const totalAiArticles = await db.newsItem.count({
      where: { isAiGenerated: true },
    })

    return NextResponse.json({
      lastGeneration: lastArticle?.createdAt ?? null,
      totalAiArticles,
      lastArticleTitle: lastArticle?.title ?? null,
      pexelsConfigured: isPexelsConfigured,
      dataMode: isRealDataMode ? 'real' : 'mock',
    })
  } catch (error) {
    console.error('Error fetching generation status:', error)
    return NextResponse.json({ error: 'Failed to fetch generation status' }, { status: 500 })
  }
}

// --- POST: generate articles with LLM + Pexels + SEO ---

export async function POST() {
  try {
    const matches = await db.match.findMany({
      where: { status: { in: ['LIVE', 'FT', 'HT'] } },
      orderBy: { isHot: 'desc' },
    })

    if (matches.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pertandingan live atau selesai untuk dibuat berita.', articles: [] })
    }

    // Dedup: skip jika sudah ada artikel untuk match+category dalam 2 jam terakhir
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentArticles = await db.newsItem.findMany({
      where: { isAiGenerated: true, createdAt: { gte: twoHoursAgo } },
    })
    const dedupKey = (matchId: string, cat: string) => `${matchId}::${cat}`
    const recentSet = new Set(recentArticles.map((a) => dedupKey(a.matchId ?? '', a.category)))

    const candidates: { match: (typeof matches)[number]; category: string }[] = []
    for (const match of matches) {
      const category = matchCategory(match)
      if (!recentSet.has(dedupKey(match.id, category))) {
        candidates.push({ match, category })
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ message: 'Semua pertandingan sudah memiliki berita terbaru.', articles: [] })
    }

    const toProcess = candidates.slice(0, 3) // Max 3 artikel per request
    const generatedArticles: { id: string; title: string; category: string; league: string; hasImage: boolean }[] = []

    for (const { match, category } of toProcess) {
      try {
        // 1. Generate artikel dengan LLM (atau fallback ke template)
        const llmResult = await generateArticleWithLLM(match, category)
        const articleData = llmResult || generateArticleFromTemplate(match, category)

        // 2. Cari gambar dari Pexels
        let imageUrl = ''
        let imageAlt = articleData.imageAlt || `${match.homeTeam} vs ${match.awayTeam} | GOALZONE`
        let imagePhotographer = ''
        let imagePhotographerUrl = ''

        if (isPexelsConfigured) {
          const searchQuery = `${match.homeTeam} ${match.awayTeam} ${match.league}`
          const pexelsResult = await searchFootballImage(searchQuery)
          if (pexelsResult) {
            imageUrl = pexelsResult.url
            imageAlt = pexelsResult.alt || imageAlt
            imagePhotographer = pexelsResult.photographer
            imagePhotographerUrl = pexelsResult.photographerUrl
          }
        }

        // 3. Buat slug unik
        const slug = toSlug(articleData.title)
        let finalSlug = slug
        try {
          const existing = await db.newsItem.findUnique({ where: { slug: finalSlug } })
          if (existing) finalSlug = `${slug}-${Date.now()}`
        } catch {
          finalSlug = `${slug}-${Date.now()}`
        }

        // 4. Generate schema.org JSON-LD
        const schemaOrg = generateSchemaOrg(
          {
            title: articleData.title,
            summary: articleData.summary,
            content: articleData.content,
            imageUrl,
            category,
            league: match.league,
            slug: finalSlug,
            createdAt: new Date(),
          },
          {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            stadium: match.stadium,
            kickoff: match.kickoff,
          }
        )

        // 5. Simpan artikel ke database
        const article = await db.newsItem.create({
          data: {
            title: articleData.title,
            slug: finalSlug,
            summary: articleData.summary,
            content: articleData.content,
            category,
            imageUrl,
            tags: JSON.stringify({
              tags: articleData.tags,
              imageAlt,
              imagePhotographer,
              imagePhotographerUrl,
              schemaOrg,
            }),
            seoTitle: articleData.seoTitle,
            seoDescription: articleData.seoDescription,
            keywords: articleData.keywords || '',
            league: match.league,
            matchId: match.id,
            isAiGenerated: true,
            source: 'GOALZONE AI',
          },
        })

        generatedArticles.push({
          id: article.id,
          title: article.title,
          category: article.category,
          league: article.league,
          hasImage: imageUrl.length > 0,
        })

        console.log(`📰 Generated: "${articleData.title}" ${imageUrl ? '📷' : '🚫📷'} [${category}]`)
      } catch (err) {
        console.error(`Error generating article for match ${match.id}:`, err)
      }
    }

    return NextResponse.json({
      message: `Berhasil generate ${generatedArticles.length} artikel`,
      articles: generatedArticles,
      pexelsEnabled: isPexelsConfigured,
      llmEnabled: true,
    })
  } catch (error) {
    console.error('Error in news generation:', error)
    return NextResponse.json({ error: 'Gagal generate berita' }, { status: 500 })
  }
}
