/**
 * GOALZONE Pexels Image Service
 * Fetches relevant football/sports images from Pexels API
 * FREE: 200 requests/hour, 20,000 requests/month
 * Register at: https://www.pexels.com/api/
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

export const isPexelsConfigured = PEXELS_API_KEY.length > 0

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

interface PexelsResponse {
  photos: PexelsPhoto[]
  total_results: number
  page: number
  per_page: number
}

// --- Search football images ---
export async function searchFootballImage(query: string, orientation: string = 'landscape'): Promise<{
  url: string
  alt: string
  photographer: string
  photographerUrl: string
  width: number
  height: number
} | null> {
  if (!isPexelsConfigured) {
    console.log('📷 Pexels API not configured, skipping image search')
    return null
  }

  try {
    // Tambahkan kata kunci football/soccer untuk hasil lebih relevan
    const searchQuery = `${query} football soccer stadium`.trim()

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=${orientation}`,
      {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 3600 }, // Cache 1 jam
      }
    )

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`)
      return null
    }

    const data: PexelsResponse = await response.json()

    if (data.photos.length === 0) {
      // Fallback: coba query lebih singkat
      const fallbackQuery = query.split(' ').slice(0, 2).join(' ')
      const fallbackResponse = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(fallbackQuery + ' football')}&per_page=3&orientation=${orientation}`,
        {
          headers: { Authorization: PEXELS_API_KEY },
          next: { revalidate: 3600 },
        }
      )
      if (!fallbackResponse.ok) return null
      const fallbackData: PexelsResponse = await fallbackResponse.json()
      if (fallbackData.photos.length === 0) return null
      const photo = fallbackData.photos[0]
      return {
        url: photo.src.landscape || photo.src.large,
        alt: photo.alt || generateAltText(query),
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        width: photo.width,
        height: photo.height,
      }
    }

    // Pilih foto terbaik (pertama)
    const photo = data.photos[0]
    return {
      url: photo.src.landscape || photo.src.large,
      alt: photo.alt || generateAltText(query),
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
    }
  } catch (error) {
    console.error('Error searching Pexels:', error)
    return null
  }
}

// --- Generate SEO-friendly alt text ---
function generateAltText(query: string): string {
  const cleanQuery = query.replace(/[^\w\s]/g, '').trim()
  return `${cleanQuery} - Pertandingan Sepak Bola | GOALZONE`
}

// --- Batch search for multiple queries ---
export async function searchMultipleImages(
  queries: string[],
  orientation: string = 'landscape'
): Promise<Map<string, {
  url: string
  alt: string
  photographer: string
  photographerUrl: string
} | null>> {
  const results = new Map<string, {
    url: string
    alt: string
    photographer: string
    photographerUrl: string
  } | null>()

  for (const query of queries) {
    const result = await searchFootballImage(query, orientation)
    results.set(query, result)
    // Rate limit: kecilkan delay antar request
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}
