import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isRealDataMode } from '@/lib/football-api'
import { isPexelsConfigured } from '@/lib/pexels-api'

// GET: Status semua API configuration
export async function GET() {
  const footballApiKey = process.env.FOOTBALL_API_KEY || ''
  const pexelsApiKey = process.env.PEXELS_API_KEY || ''
  const dataMode = process.env.DATA_MODE || 'mock'

  return NextResponse.json({
    dataMode,
    apis: {
      football: {
        configured: isRealDataMode,
        keySet: footballApiKey.length > 0,
        keyPreview: footballApiKey ? `${footballApiKey.slice(0, 4)}...${footballApiKey.slice(-4)}` : 'NOT SET',
        host: process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io',
        mode: isRealDataMode ? 'real' : 'mock',
        description: 'API-Football: Live scores, standings, scorers, lineups. Daftar di https://www.api-football.com/',
      },
      pexels: {
        configured: isPexelsConfigured,
        keySet: pexelsApiKey.length > 0,
        keyPreview: pexelsApiKey ? `${pexelsApiKey.slice(0, 4)}...${pexelsApiKey.slice(-4)}` : 'NOT SET',
        description: 'Pexels: Gambar berita otomatis. Daftar GRATIS di https://www.pexels.com/api/',
      },
      llm: {
        configured: true,
        description: 'LLM (DeepSeek-V3): Auto-generate artikel berita. Sudah aktif via z-ai-web-dev-sdk.',
      },
    },
    actions: {
      syncData: 'POST /api/football - Sync data dari Football API ke database',
      generateNews: 'POST /api/news/generate - Generate berita otomatis dengan LLM + Pexels + SEO',
      checkStatus: 'GET /api/admin/api-config - Lihat status konfigurasi API',
    },
    instructions: {
      step1: 'Set FOOTBALL_API_KEY di .env (daftar di https://www.api-football.com/)',
      step2: 'Set PEXELS_API_KEY di .env (daftar gratis di https://www.pexels.com/api/)',
      step3: 'Set DATA_MODE=real di .env untuk menggunakan data real',
      step4: 'Restart server setelah mengubah .env',
      step5: 'Gunakan POST /api/football untuk sync data pertama kali',
    },
  })
}
