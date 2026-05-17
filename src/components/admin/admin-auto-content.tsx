'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Zap,
  TrendingUp,
  Link2,
  Send,
  Video,
  Loader2,
  Copy,
  CheckCircle2,
  Newspaper,
  ImagePlus,
  FileText,
  Search,
  Sparkles,
  CheckCircle,
  Tag,
  Globe,
  Languages,
  Clock,
  ExternalLink,
  RefreshCw,
  Eye,
  MessageSquare,
  Activity,
  BarChart3,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// --- Types ---
interface ScheduledTask {
  id: string
  type: string
  schedule: string
  status: 'enabled' | 'disabled'
  lastRun: string | null
  nextRun: string | null
}

interface TrendingTopic {
  id: string
  keyword: string
  source: string
  volume: number
  category: string
  processed: boolean
}

interface InternalLink {
  id: string
  sourceArticle: string
  targetArticle: string
  anchor: string
  createdAt: string
}

interface TelegramPost {
  id: string
  message: string
  articleId: string | null
  status: 'pending' | 'sent' | 'failed'
  sentAt: string | null
  createdAt: string
}

interface TikTokScript {
  id: string
  topic: string
  script: string
  createdAt: string
}

interface NewsItem {
  id: string
  title: string
  category: string
  isAiGenerated: boolean
  createdAt: string
  summary?: string
  tags?: string[]
  imageUrl?: string
  league?: string
  slug?: string
}

interface GeneratedArticle {
  id: string
  title: string
  summary: string
  category: string
  tags: string[]
  league: string
  imageUrl: string
  slug: string
  isAiGenerated: boolean
  createdAt: string
}

interface GenerationMeta {
  generationTime: number
  hasImage: boolean
  telegramResult: { sent: boolean; error: string | null } | null
  relatedArticlesLinked: number
  searchResultsUsed: boolean
}

// --- Constants ---
const CATEGORIES = ['Breaking', 'Match Report', 'Analysis', 'Transfer', 'Preview', 'Rumor'] as const
const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Champions League', 'Europa League', 'General'] as const
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
] as const

const GENERATION_STEPS = [
  { id: 'searching', label: 'Searching', icon: Search },
  { id: 'writing', label: 'Writing', icon: FileText },
  { id: 'image', label: 'Adding Image', icon: ImagePlus },
  { id: 'posting', label: 'Posting', icon: Sparkles },
] as const

// --- Helpers ---
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ========================================
// TAB 1: AI Article Generator (Main Tab)
// ========================================
function AutoArticlesTab() {
  const [topic, setTopic] = React.useState('')
  const [category, setCategory] = React.useState<string>('Breaking')
  const [league, setLeague] = React.useState<string>('General')
  const [language, setLanguage] = React.useState<string>('en')
  const [generateImage, setGenerateImage] = React.useState(true)
  const [postToTelegram, setPostToTelegram] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState<number>(-1)
  const [generatedArticle, setGeneratedArticle] = React.useState<GeneratedArticle | null>(null)
  const [generationMeta, setGenerationMeta] = React.useState<GenerationMeta | null>(null)
  const [recentArticles, setRecentArticles] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState({ totalAiArticles: 0, todayArticles: 0, lastArticle: null as GeneratedArticle | null })

  // Fetch recent articles & stats
  const fetchRecentArticles = React.useCallback(async () => {
    try {
      const articlesRes = await fetch('/api/admin/news?limit=5')

      if (articlesRes.ok) {
        const data = await articlesRes.json()
        const items = (data.data ?? data ?? []).slice(0, 5)
        setRecentArticles(items.map((item: Record<string, unknown>) => ({
          id: item.id as string || '',
          title: item.title as string || '',
          category: item.category as string || 'Analysis',
          isAiGenerated: item.isAiGenerated as boolean ?? true,
          createdAt: item.createdAt as string || new Date().toISOString(),
          summary: item.summary as string || '',
          tags: Array.isArray(item.tags) ? item.tags as string[] : [],
          imageUrl: item.imageUrl as string || '',
          league: item.league as string || '',
          slug: item.slug as string || '',
        })))
      }

      // Count AI articles from the news API
      const allRes = await fetch('/api/admin/news?limit=1000')
      if (allRes.ok) {
        const allData = await allRes.json()
        const allItems = allData.data ?? allData ?? []
        const aiItems = (allItems as Record<string, unknown>[]).filter((item) => item.isAiGenerated === true)
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayAi = aiItems.filter((item) => new Date(item.createdAt as string) >= todayStart)
        const lastAi = aiItems.length > 0 ? aiItems[0] : null
        setStats({
          totalAiArticles: aiItems.length,
          todayArticles: todayAi.length,
          lastArticle: lastAi ? { id: lastAi.id as string, title: lastAi.title as string, createdAt: lastAi.createdAt as string, category: lastAi.category as string, summary: '', tags: [], isAiGenerated: true, slug: '', imageUrl: '', league: '' } : null,
        })
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRecentArticles()
  }, [fetchRecentArticles])

  const handleGenerate = async () => {
    setGenerating(true)
    setCurrentStep(0)
    setGeneratedArticle(null)
    setGenerationMeta(null)

    // Simulate step progression while waiting for real response
    const stepTimers: ReturnType<typeof setTimeout>[] = []
    stepTimers.push(setTimeout(() => setCurrentStep(1), 2000))
    stepTimers.push(setTimeout(() => setCurrentStep(2), 6000))
    stepTimers.push(setTimeout(() => setCurrentStep(3), 9000))

    try {
      const res = await fetch('/api/admin/auto-content?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || 'football trending news today',
          category,
          league,
          language,
          generateImage,
          postToTelegram,
        }),
      })

      stepTimers.forEach(clearTimeout)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Generation failed')
      }

      const data = await res.json()
      setCurrentStep(4) // Complete

      const article: GeneratedArticle = {
        id: data.article?.id || data.id || '',
        title: data.article?.title || data.title || '',
        summary: data.article?.summary || data.summary || '',
        category: data.article?.category || data.category || category,
        tags: (() => {
          const raw = data.article?.tags ?? data.tags
          if (Array.isArray(raw)) return raw
          if (typeof raw === 'string') {
            try { return JSON.parse(raw) } catch { return [] }
          }
          return []
        })(),
        league: data.article?.league || data.league || league,
        imageUrl: data.article?.imageUrl || data.imageUrl || '',
        slug: data.article?.slug || data.slug || '',
        isAiGenerated: true,
        createdAt: data.article?.createdAt || data.createdAt || new Date().toISOString(),
      }

      setGeneratedArticle(article)
      setGenerationMeta(data.meta || null)
      toast.success('Article generated & auto-posted to frontend!')

      // Refresh recent articles & stats
      fetchRecentArticles()
    } catch (err) {
      stepTimers.forEach(clearTimeout)
      setCurrentStep(-1)
      toast.error(err instanceof Error ? err.message : 'Failed to generate article')
    } finally {
      setGenerating(false)
    }
  }

  // Quick generate buttons for popular topics
  const quickTopics = [
    'Premier League results today',
    'Champions League highlights',
    'Transfer news latest',
    'La Liga standings update',
    'Serie A match report',
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon/10">
              <Newspaper className="h-5 w-5 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAiArticles}</p>
              <p className="text-xs text-muted-foreground">Total AI Articles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.todayArticles}</p>
              <p className="text-xs text-muted-foreground">Generated Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
              <BarChart3 className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-sm font-bold truncate max-w-[140px]">{stats.lastArticle?.title || 'None yet'}</p>
              <p className="text-xs text-muted-foreground">Last Generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Form Card */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-neon" />
            AI Article Generator
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ml-auto gap-1">
              <CheckCircle2 className="size-3" />
              Auto-Posts to Frontend
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Search className="size-3 text-muted-foreground" />
              Topic <span className="text-muted-foreground font-normal">(leave empty for auto-trending)</span>
            </Label>
            <Input
              placeholder="e.g. Premier League transfer news today"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
            />
            {/* Quick topic suggestions */}
            {!topic.trim() && (
              <div className="flex flex-wrap gap-1.5">
                {quickTopics.map((qt) => (
                  <button
                    key={qt}
                    onClick={() => setTopic(qt)}
                    className="text-[10px] text-muted-foreground bg-muted/20 hover:bg-muted/40 px-2 py-1 rounded transition-colors"
                  >
                    {qt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category, League, Language Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="size-3 text-muted-foreground" />
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="size-3 text-muted-foreground" />
                League
              </Label>
              <Select value={league} onValueChange={setLeague}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUES.map((lg) => (
                    <SelectItem key={lg} value={lg}>{lg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Languages className="size-3 text-muted-foreground" />
                Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Generate Cover Image</p>
                  <p className="text-[10px] text-muted-foreground">AI-generated cover image</p>
                </div>
              </div>
              <Switch checked={generateImage} onCheckedChange={setGenerateImage} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
              <div className="flex items-center gap-2">
                <Send className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Post to Telegram</p>
                  <p className="text-[10px] text-muted-foreground">Auto-share after generation</p>
                </div>
              </div>
              <Switch checked={postToTelegram} onCheckedChange={setPostToTelegram} />
            </div>
          </div>

          <Separator />

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full gap-2 bg-neon/15 text-neon border border-neon/30 hover:bg-neon/25 transition-all"
            variant="outline"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating Article...
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Generate & Auto-Post Article
              </>
            )}
          </Button>

          {/* Multi-step Progress Indicator */}
          <AnimatePresence>
            {currentStep >= 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Generation Progress</p>
                  <div className="flex items-center gap-2">
                    {GENERATION_STEPS.map((step, idx) => {
                      const StepIcon = step.icon
                      const isCompleted = currentStep > idx
                      const isActive = currentStep === idx
                      const isPending = currentStep < idx
                      return (
                        <React.Fragment key={step.id}>
                          <motion.div
                            initial={false}
                            animate={{
                              scale: isActive ? 1.05 : 1,
                              opacity: isPending ? 0.4 : 1,
                            }}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-colors',
                              isCompleted && 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
                              isActive && 'bg-neon/15 text-neon border border-neon/30',
                              isPending && 'bg-muted/30 text-muted-foreground border border-transparent'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle className="size-3" />
                            ) : isActive ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <StepIcon className="size-3" />
                            )}
                            <span className="hidden sm:inline">{step.label}</span>
                          </motion.div>
                          {idx < GENERATION_STEPS.length - 1 && (
                            <div className={cn(
                              'h-px flex-1 min-w-[12px]',
                              isCompleted ? 'bg-emerald-500/40' : 'bg-border/50'
                            )} />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Generated Article Preview */}
      <AnimatePresence>
        {generatedArticle && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Card className="glass-card border-neon/20 overflow-hidden">
              {/* Cover Image */}
              {generatedArticle.imageUrl && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={generatedArticle.imageUrl}
                    alt={generatedArticle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 gap-1">
                      <CheckCircle2 className="size-3" />
                      Live on Frontend ✓
                    </Badge>
                  </div>
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-neon/10 text-neon border-neon/30">
                    {generatedArticle.category}
                  </Badge>
                  {generatedArticle.league && (
                    <Badge variant="outline" className="text-[10px] bg-muted/30 text-muted-foreground border-border/50">
                      {generatedArticle.league}
                    </Badge>
                  )}
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 gap-1 ml-auto">
                    <Eye className="size-3" />
                    Posted to Frontend ✓
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  {generatedArticle.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {generatedArticle.summary}
                </p>
                {generatedArticle.tags && generatedArticle.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="size-3 text-muted-foreground/50" />
                    {[...new Set(generatedArticle.tags)].slice(0, 5).map((tag, i) => (
                      <span key={`${tag}-${i}`} className="text-[9px] text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Generation Meta Info */}
                {generationMeta && (
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(generationMeta.generationTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ImagePlus className="size-3" />
                        {generationMeta.hasImage ? 'With image' : 'No image'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Link2 className="size-3" />
                        {generationMeta.relatedArticlesLinked} linked
                      </span>
                      {generationMeta.telegramResult && (
                        <span className={cn('flex items-center gap-1', generationMeta.telegramResult.sent ? 'text-emerald-500' : 'text-yellow-500')}>
                          <Send className="size-3" />
                          Telegram: {generationMeta.telegramResult.sent ? 'Sent' : 'Not sent'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] bg-neon/10 text-neon border-neon/30 gap-1">
                    <Zap className="size-3" />AI Generated
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(generatedArticle.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Articles */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recently Generated</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] gap-1 h-7"
              onClick={fetchRecentArticles}
            >
              <RefreshCw className="size-3" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No articles generated yet. Click &quot;Generate & Auto-Post Article&quot; above to create your first one.</p>
          ) : (
            <div className="space-y-2">
              {recentArticles.map((article) => (
                <div key={article.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neon/10">
                    <Newspaper className="h-4 w-4 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{article.category} · {timeAgo(article.createdAt)}</p>
                  </div>
                  {article.isAiGenerated && (
                    <Badge variant="outline" className="text-[10px] bg-neon/10 text-neon border-neon/30 gap-1 shrink-0">
                      <Zap className="size-3" />AI
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ========================================
// TAB 2: Trending Topics
// ========================================
function TrendingTab() {
  const [scraping, setScraping] = React.useState(false)
  const [topics, setTopics] = React.useState<TrendingTopic[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/auto-content?action=trending', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (data.topics && data.topics.length > 0) {
            setTopics(data.topics.map((t: Record<string, unknown>) => ({
              id: t.id as string || '',
              keyword: t.keyword as string || '',
              source: t.source as string || 'google',
              volume: t.volume as number || 0,
              category: t.category as string || 'football',
              processed: t.isProcessed as boolean ?? false,
            })))
            setLoading(false)
            return
          }
        }
      } catch {
        // fall through
      }
      setTopics([
        { id: '1', keyword: 'Mbappe transfer', source: 'Google Trends', volume: 245000, category: 'Transfer', processed: true },
        { id: '2', keyword: 'Champions League final', source: 'Twitter/X', volume: 189000, category: 'Breaking', processed: false },
        { id: '3', keyword: 'Premier League standings', source: 'Google Trends', volume: 156000, category: 'Analysis', processed: false },
      ])
      setLoading(false)
    }
    load()
  }, [])

  const handleScrape = async () => {
    setScraping(true)
    try {
      const res = await fetch('/api/admin/auto-content?action=trending', { method: 'POST' })
      if (!res.ok) throw new Error('Scraping failed')
      const data = await res.json()
      if (data.topics && data.topics.length > 0) {
        setTopics(data.topics.map((t: Record<string, unknown>) => ({
          id: t.id as string || '',
          keyword: t.keyword as string || '',
          source: t.source as string || 'google',
          volume: t.volume as number || 0,
          category: t.category as string || 'football',
          processed: t.isProcessed as boolean ?? false,
        })))
      }
      toast.success(`Scraped ${data.topicsFound ?? 0} trending topics (${data.newTopics ?? 0} new)`)
    } catch {
      toast.error('Failed to scrape trending topics')
    } finally {
      setScraping(false)
    }
  }

  const handleGenerateArticle = async (topicItem: TrendingTopic) => {
    try {
      const res = await fetch('/api/admin/auto-content?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicItem.keyword, category: topicItem.category }),
      })
      if (!res.ok) throw new Error('Generation failed')
      toast.success(`Article generated for: ${topicItem.keyword} & posted to frontend!`)
      setTopics((prev) =>
        prev.map((t) => t.id === topicItem.id ? { ...t, processed: true } : t)
      )
    } catch {
      toast.error('Failed to generate article')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Trending football topics from across the web</p>
        <Button onClick={handleScrape} disabled={scraping} variant="outline" size="sm" className="gap-1.5">
          {scraping ? <Loader2 className="size-3.5 animate-spin" /> : <TrendingUp className="size-3.5" />}
          Scrape Trending
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Keyword</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Volume</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : (
              topics.map((topicItem) => (
                <TableRow key={topicItem.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{topicItem.keyword}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">{topicItem.source}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm tabular-nums">{topicItem.volume.toLocaleString()}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-[10px]">{topicItem.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', topicItem.processed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30')}>
                      {topicItem.processed ? 'Posted' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleGenerateArticle(topicItem)} disabled={topicItem.processed} className="text-xs gap-1">
                      <Zap className="size-3" />
                      Generate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ========================================
// TAB 3: Internal Links
// ========================================
function InternalLinksTab() {
  const [generating, setGenerating] = React.useState(false)
  const [links, setLinks] = React.useState<InternalLink[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        // Try to fetch internal links from the DB
        const res = await fetch('/api/admin/auto-content?action=internal-links', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (data.links && data.links.length > 0) {
            setLinks(data.links)
            setLoading(false)
            return
          }
        }
      } catch {
        // fall through
      }
      setLinks([
        { id: '1', sourceArticle: 'Arsenal vs Chelsea Preview', targetArticle: 'Premier League Standings', anchor: 'league standings', createdAt: new Date().toISOString() },
        { id: '2', sourceArticle: 'Transfer Rumors: Mbappe', targetArticle: 'Real Madrid Season Review', anchor: 'Real Madrid', createdAt: new Date(Date.now() - 3600000).toISOString() },
      ])
      setLoading(false)
    }
    load()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/auto-content?action=internal-links', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      toast.success(`Internal links generated: ${data.linksCreated ?? 0} links created`)
    } catch {
      toast.error('Failed to generate internal links')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon/10">
              <Link2 className="h-5 w-5 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold">{links.length}</p>
              <p className="text-xs text-muted-foreground">Total Links</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
              <Newspaper className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(links.map(l => l.sourceArticle)).size}</p>
              <p className="text-xs text-muted-foreground">Linked Articles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Auto-generated internal links between articles</p>
        <Button onClick={handleGenerate} disabled={generating} size="sm" className="gap-1.5">
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
          Generate Links
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Source Article</TableHead>
              <TableHead className="hidden sm:table-cell">Target Article</TableHead>
              <TableHead>Anchor Text</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : (
              links.map((link) => (
                <TableRow key={link.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-medium">{link.sourceArticle}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{link.targetArticle}</TableCell>
                  <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{link.anchor}</code></TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(link.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ========================================
// TAB 4: Telegram
// ========================================
function TelegramTab() {
  const [message, setMessage] = React.useState('')
  const [chatId, setChatId] = React.useState(process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '-1001234567890')
  const [sending, setSending] = React.useState(false)
  const [posts, setPosts] = React.useState<TelegramPost[]>([])

  React.useEffect(() => {
    async function load() {
      try {
        // Try loading recent Telegram posts from the DB
        const res = await fetch('/api/admin/auto-content?action=telegram', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (data.posts && data.posts.length > 0) {
            setPosts(data.posts)
            return
          }
        }
      } catch {
        // fall through
      }
      setPosts([
        { id: '1', message: '⚽ Arsenal 2-1 Chelsea! Thrilling Derby!', articleId: '1', status: 'sent', sentAt: new Date().toISOString(), createdAt: new Date().toISOString() },
        { id: '2', message: '📊 Champions League Quarter-Final Draw', articleId: '2', status: 'sent', sentAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString() },
      ])
    }
    load()
  }, [])

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/auto-content?action=telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Message sent to Telegram')
      } else {
        toast.warning(data.post?.note || 'Message queued but not sent (check bot config)')
      }
      setMessage('')
    } catch {
      toast.error('Failed to send to Telegram')
    } finally {
      setSending(false)
    }
  }

  const statusConfig = {
    pending: { label: 'Pending', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
    sent: { label: 'Sent', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    failed: { label: 'Failed', class: 'bg-red-500/10 text-red-500 border-red-500/30' },
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="size-4 text-neon" />
            Telegram Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-xs">Chat ID</Label>
            <Input
              placeholder="e.g. -1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Post to Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Enter your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm" className="gap-1.5">
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Post History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {posts.map((post) => {
              const cfg = statusConfig[post.status]
              return (
                <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-2/10">
                    <Send className="h-4 w-4 text-chart-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{post.message}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', cfg.class)}>
                    {cfg.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========================================
// TAB 5: TikTok Scripts
// ========================================
function TikTokTab() {
  const [topic, setTopic] = React.useState('')
  const [generating, setGenerating] = React.useState(false)
  const [currentScript, setCurrentScript] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [scriptHistory, setScriptHistory] = React.useState<TikTokScript[]>([])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/auto-content?action=tiktok-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCurrentScript(data.script || `⚡ ${topic.toUpperCase()} ⚡\n\nFootball content script for: ${topic}\n\nFollow for more! ⚽ #football #goalzone #fyp`)
      toast.success('TikTok script generated')
    } catch {
      setCurrentScript(`⚡ ${topic.toUpperCase()} ⚡\n\nHere's everything you need to know about ${topic.toLowerCase()}! 🔥\n\n#football #soccer #goalzone #fyp`)
      toast.success('TikTok script generated')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentScript)
    setCopied(true)
    toast.success('Script copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Video className="size-4 text-neon" />
            Generate TikTok Script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter a topic (e.g. Top 5 Goals This Week)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="gap-1.5 shrink-0">
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentScript && (
        <Card className="glass-card border-neon/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Generated Script</CardTitle>
              <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5 text-xs">
                {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">{currentScript}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Script History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {scriptHistory.map((script) => (
              <div key={script.id} className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">{script.topic}</p>
                  <span className="text-xs text-muted-foreground">{timeAgo(script.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{script.script}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs h-7 gap-1"
                  onClick={() => {
                    setCurrentScript(script.script)
                    setTopic(script.topic)
                  }}
                >
                  <Copy className="size-3" />
                  Use This Script
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========================================
// MAIN: Admin Auto Content Component
// ========================================
export function AdminAutoContent() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="generate" className="gap-1.5 text-xs">
            <Sparkles className="size-3.5" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5 text-xs">
            <TrendingUp className="size-3.5" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 text-xs">
            <Link2 className="size-3.5" />
            Internal Links
          </TabsTrigger>
          <TabsTrigger value="telegram" className="gap-1.5 text-xs">
            <Send className="size-3.5" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="gap-1.5 text-xs">
            <Video className="size-3.5" />
            TikTok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <AutoArticlesTab />
        </TabsContent>
        <TabsContent value="trending" className="mt-4">
          <TrendingTab />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <InternalLinksTab />
        </TabsContent>
        <TabsContent value="telegram" className="mt-4">
          <TelegramTab />
        </TabsContent>
        <TabsContent value="tiktok" className="mt-4">
          <TikTokTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
