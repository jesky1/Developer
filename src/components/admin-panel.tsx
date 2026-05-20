'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, X, FileText, Eye, EyeOff, Pencil, Trash2, Star,
  Zap, RefreshCw, ChevronDown, Search, Loader2, Clock,
  TrendingUp, BarChart3, Settings2, Wand2, Plus, Check,
  ExternalLink, Globe, Instagram, Twitter, Facebook,
  EyeIcon, ChevronRight, Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// --- Types ---

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface StatsData {
  totalArticles: number
  totalViews: number
  aiGenerated: number
  publishedCount: number
  draftCount: number
  articlesToday: number
  recentArticles: Array<{
    id: string
    title: string
    category: string
    viewCount: number
    isPublished: boolean
    createdAt: string
  }>
  analytics: {
    articlesByDay: Array<{ date: string; count: number }>
    categoryDistribution: Array<{ category: string; count: number }>
    topArticles: Array<{ id: string; title: string; category: string; viewCount: number }>
  }
  autoPost: {
    enabled: boolean
    interval: number
    lastGeneration: string | null
    lastArticleTitle: string | null
    generatedToday: number
  }
}

interface Article {
  id: string
  title: string
  slug: string | null
  summary: string
  content: string
  category: string
  imageUrl: string
  source: string
  tags: string[]
  league: string
  isAiGenerated: boolean
  isHeadline: boolean
  isPublished: boolean
  viewCount: number
  publishedAt: string
  createdAt: string
  updatedAt: string
}

interface SettingsData {
  siteName: string
  siteDescription: string
  pexelsApiKey: string
  twitterUrl: string
  facebookUrl: string
  instagramUrl: string
  adsenseClientId: string
  autoPostEnabled: boolean
  autoPostInterval: number
}

const CATEGORIES = [
  'Breaking', 'Transfer', 'Liga 1', 'Liga Inggris',
  'Liga Spanyol', 'Liga Italia', 'Liga Jerman',
  'Liga Champions', 'Analisis', 'Prediksi',
]

const NEON_COLORS = [
  'oklch(0.72 0.22 155)',
  'oklch(0.72 0.18 260)',
  'oklch(0.75 0.18 55)',
  'oklch(0.60 0.22 300)',
  'oklch(0.70 0.20 30)',
  'oklch(0.72 0.22 155)',
  'oklch(0.65 0.20 180)',
  'oklch(0.72 0.18 80)',
  'oklch(0.60 0.22 300)',
  'oklch(0.70 0.20 30)',
]

// --- Helpers ---

function formatViews(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M'
  if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K'
  return count.toString()
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} hari lalu`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const CATEGORY_COLORS: Record<string, string> = {
  'Breaking': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Transfer': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Liga 1': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Liga Inggris': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Liga Spanyol': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Liga Italia': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'Liga Jerman': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Liga Champions': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Analisis': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Prediksi': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

// --- Component ---

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      toast.error('Gagal memuat statistik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchStats()
    }
  }, [isOpen, fetchStats])

  // Reset tab when panel opens
  useEffect(() => {
    if (isOpen) setActiveTab('dashboard')
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-full sm:max-w-5xl glass-card overflow-hidden flex flex-col"
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon/10 border border-neon/20">
                  <Shield className="w-5 h-5 text-neon" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    GOALZONE <span className="text-neon">Admin</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Panel manajemen & kontrol
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 sm:px-6 pt-3 border-b border-border/30">
                <TabsList className="bg-surface/80 h-9 p-0.5 w-full sm:w-auto overflow-x-auto">
                  <TabsTrigger value="dashboard" className="text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon cursor-pointer">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="articles" className="text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon cursor-pointer">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Artikel
                  </TabsTrigger>
                  <TabsTrigger value="autogenerate" className="text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon cursor-pointer">
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Auto-Generate
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon cursor-pointer">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    Analitik
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon cursor-pointer">
                    <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                    Pengaturan
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Contents - scrollable */}
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="dashboard" className="m-0 p-4 sm:p-6">
                  <DashboardTab stats={stats} loading={loading} onClose={onClose} onRefresh={fetchStats} />
                </TabsContent>
                <TabsContent value="articles" className="m-0 p-4 sm:p-6">
                  <ArticlesTab />
                </TabsContent>
                <TabsContent value="autogenerate" className="m-0 p-4 sm:p-6">
                  <AutoGenerateTab stats={stats} loading={loading} onRefresh={fetchStats} />
                </TabsContent>
                <TabsContent value="analytics" className="m-0 p-4 sm:p-6">
                  <AnalyticsTab stats={stats} loading={loading} />
                </TabsContent>
                <TabsContent value="settings" className="m-0 p-4 sm:p-6">
                  <SettingsTab />
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ==================== TAB 1: DASHBOARD ====================

function DashboardTab({ stats, loading, onClose, onRefresh }: {
  stats: StatsData | null
  loading: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/news/auto-generate', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Artikel "${data.article?.title}" berhasil dibuat!`)
        onRefresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Gagal membuat artikel')
      }
    } catch {
      toast.error('Gagal membuat artikel')
    } finally {
      setGenerating(false)
    }
  }, [onRefresh])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Artikel"
          value={stats?.totalArticles ?? 0}
          icon={<FileText className="w-4 h-4" />}
          badge={stats?.articlesToday ? `+${stats.articlesToday} hari ini` : undefined}
        />
        <StatsCard
          title="Total Views"
          value={formatViews(stats?.totalViews ?? 0)}
          icon={<EyeIcon className="w-4 h-4" />}
        />
        <StatsCard
          title="AI Generated"
          value={stats?.aiGenerated ?? 0}
          icon={<Zap className="w-4 h-4" />}
        />
        <StatsCard
          title="Publish / Draft"
          value={`${stats?.publishedCount ?? 0} / ${stats?.draftCount ?? 0}`}
          icon={<Globe className="w-4 h-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Aksi Cepat</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 cursor-pointer"
            size="sm"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Generate Artikel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-neon/20 text-neon hover:bg-neon/10 cursor-pointer"
            onClick={onRefresh}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onClose}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Lihat Situs
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Aktivitas Terbaru</h3>
        <div className="space-y-2">
          {stats?.recentArticles && stats.recentArticles.length > 0 ? (
            stats.recentArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 border border-border/30 hover:border-neon/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[article.category] || 'bg-muted/20 text-muted-foreground border-muted/30'}`}
                    >
                      {article.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(article.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <EyeIcon className="w-3 h-3" />
                  <span className="text-xs">{article.viewCount}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada artikel
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon, badge }: {
  title: string
  value: string | number
  icon: React.ReactNode
  badge?: string
}) {
  return (
    <Card className="glass-card border-border/30 bg-surface/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <div className="text-neon">{icon}</div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {badge && (
            <Badge className="text-[10px] bg-neon/15 text-neon border border-neon/20 mb-0.5">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card border-border/30">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ==================== TAB 2: ARTICLES ====================

function ArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Article>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        category: category === 'all' ? '' : category,
        status: status === 'all' ? '' : status,
      })
      const res = await fetch(`/api/admin/articles?${params}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles)
        setTotal(data.total)
      }
    } catch {
      toast.error('Gagal memuat artikel')
    } finally {
      setLoading(false)
    }
  }, [page, search, category, status])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selected.size === articles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(articles.map((a) => a.id)))
    }
  }, [selected, articles])

  const handleEdit = useCallback((article: Article) => {
    setEditingId(article.id)
    setEditForm({
      title: article.title,
      summary: article.summary,
      category: article.category,
      isPublished: article.isPublished,
      isHeadline: article.isHeadline,
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/articles/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast.success('Artikel berhasil diperbarui')
        setEditingId(null)
        setEditForm({})
        fetchArticles()
      } else {
        toast.error('Gagal memperbarui artikel')
      }
    } catch {
      toast.error('Gagal memperbarui artikel')
    } finally {
      setSaving(false)
    }
  }, [editingId, editForm, fetchArticles])

  const handleTogglePublish = useCallback(async (article: Article) => {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !article.isPublished }),
      })
      if (res.ok) {
        toast.success(article.isPublished ? 'Artikel di-unpublish' : 'Artikel dipublish')
        fetchArticles()
      }
    } catch {
      toast.error('Gagal mengubah status')
    }
  }, [fetchArticles])

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Artikel berhasil dihapus')
        fetchArticles()
      } else {
        toast.error('Gagal menghapus artikel')
      }
    } catch {
      toast.error('Gagal menghapus artikel')
    } finally {
      setDeleting(null)
    }
  }, [fetchArticles])

  const handleBulkAction = useCallback(async (action: string) => {
    if (selected.size === 0) {
      toast.error('Pilih artikel terlebih dahulu')
      return
    }

    if (action === 'delete') {
      try {
        const res = await fetch('/api/admin/articles', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selected) }),
        })
        if (res.ok) {
          toast.success(`${selected.size} artikel berhasil dihapus`)
          setSelected(new Set())
          fetchArticles()
        }
      } catch {
        toast.error('Gagal menghapus artikel')
      }
      return
    }

    try {
      const res = await fetch('/api/admin/articles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          publish: 'dipublish',
          unpublish: 'di-unpublish',
          headline: 'dijadikan headline',
        }
        toast.success(`${selected.size} artikel ${actionLabels[action] || 'diperbarui'}`)
        setSelected(new Set())
        fetchArticles()
      }
    } catch {
      toast.error('Gagal memperbarui artikel')
    }
  }, [selected, fetchArticles])

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari artikel..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 bg-surface/50 border-border/30 text-sm"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-full sm:w-40 bg-surface/50 border-border/30 text-sm">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-full sm:w-32 bg-surface/50 border-border/30 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-neon/20 text-neon cursor-pointer">
                Aksi ({selected.size})
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAction('publish')} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" /> Publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('unpublish')} className="cursor-pointer">
                <EyeOff className="w-3.5 h-3.5 mr-2" /> Unpublish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('headline')} className="cursor-pointer">
                <Star className="w-3.5 h-3.5 mr-2" /> Jadikan Headline
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleBulkAction('delete')}
                className="cursor-pointer text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Article Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada artikel ditemukan</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[32px_1fr_100px_100px_70px_80px_60px_90px_80px] gap-2 px-3 py-2 text-[10px] text-muted-foreground font-medium border-b border-border/30">
            <div>
              <Checkbox
                checked={selected.size === articles.length && articles.length > 0}
                onCheckedChange={toggleSelectAll}
                className="cursor-pointer"
              />
            </div>
            <span>Judul</span>
            <span>Kategori</span>
            <span>Liga</span>
            <span>Views</span>
            <span>Status</span>
            <span>Headline</span>
            <span>Tanggal</span>
            <span>Aksi</span>
          </div>

          {/* Article Rows */}
          {articles.map((article) => (
            <div key={article.id}>
              <div
                className="grid grid-cols-1 sm:grid-cols-[32px_1fr_100px_100px_70px_80px_60px_90px_80px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-surface/50 border border-transparent hover:border-border/30 transition-colors cursor-pointer group"
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
              >
                {/* Checkbox */}
                <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(article.id)}
                    onCheckedChange={() => toggleSelect(article.id)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Title */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {article.isAiGenerated && (
                      <Zap className="w-3 h-3 text-neon shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate">
                      {article.title}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  {/* Mobile: show category + status */}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${CATEGORY_COLORS[article.category] || ''}`}>
                      {article.category}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${article.isPublished ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>
                      {article.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    {article.isHeadline && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  </div>
                </div>

                {/* Category (desktop) */}
                <div className="hidden sm:block">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[article.category] || ''}`}>
                    {article.category}
                  </Badge>
                </div>

                {/* League (desktop) */}
                <span className="hidden sm:block text-xs text-muted-foreground truncate">
                  {article.league || '-'}
                </span>

                {/* Views (desktop) */}
                <span className="hidden sm:block text-xs text-muted-foreground">
                  {formatViews(article.viewCount)}
                </span>

                {/* Status (desktop) */}
                <div className="hidden sm:block">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${article.isPublished ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>
                    {article.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>

                {/* Headline (desktop) */}
                <div className="hidden sm:block">
                  {article.isHeadline && (
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  )}
                </div>

                {/* Date (desktop) */}
                <span className="hidden sm:block text-[10px] text-muted-foreground">
                  {formatDate(article.createdAt)}
                </span>

                {/* Actions (desktop) */}
                <div className="hidden sm:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-neon cursor-pointer"
                    onClick={() => handleEdit(article)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-neon cursor-pointer"
                    onClick={() => handleTogglePublish(article)}
                  >
                    {article.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-400 cursor-pointer"
                    onClick={() => handleDelete(article.id)}
                    disabled={deleting === article.id}
                  >
                    {deleting === article.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Preview / Edit Mode */}
              <AnimatePresence>
                {expandedId === article.id && editingId !== article.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mb-2 p-3 rounded-lg bg-surface/40 border border-border/20 space-y-2">
                      <p className="text-xs text-muted-foreground">{article.summary}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><EyeIcon className="w-3 h-3" /> {article.viewCount} views</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(article.createdAt)}</span>
                        {article.isAiGenerated && (
                          <span className="flex items-center gap-1 text-neon"><Zap className="w-3 h-3" /> AI</span>
                        )}
                      </div>
                      {/* Mobile action buttons */}
                      <div className="flex gap-2 sm:hidden">
                        <Button size="sm" variant="outline" className="h-7 text-xs cursor-pointer" onClick={() => handleEdit(article)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs cursor-pointer" onClick={() => handleTogglePublish(article)}>
                          {article.isPublished ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {article.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 hover:text-red-400 cursor-pointer" onClick={() => handleDelete(article.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Hapus
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline Edit Mode */}
              <AnimatePresence>
                {editingId === article.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mb-2 p-4 rounded-lg bg-surface/40 border border-neon/20 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Judul</Label>
                        <Input
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="h-8 bg-surface/80 border-border/30 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Ringkasan</Label>
                        <Textarea
                          value={editForm.summary || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                          className="bg-surface/80 border-border/30 text-sm min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Kategori</Label>
                          <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                            <SelectTrigger className="h-8 bg-surface/80 border-border/30 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Published</Label>
                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              checked={editForm.isPublished ?? true}
                              onCheckedChange={(v) => setEditForm((f) => ({ ...f, isPublished: v }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Headline</Label>
                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              checked={editForm.isHeadline ?? false}
                              onCheckedChange={(v) => setEditForm((f) => ({ ...f, isHeadline: v }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 cursor-pointer"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => { setEditingId(null); setEditForm({}) }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <span className="text-xs text-muted-foreground">
          Menampilkan {articles.length} dari {total} artikel
        </span>
        {page * 20 < total && (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setPage((p) => p + 1)}
          >
            Muat Lebih Banyak
          </Button>
        )}
      </div>
    </div>
  )
}

// ==================== TAB 3: AUTO-GENERATE ====================

function AutoGenerateTab({ stats, loading, onRefresh }: {
  stats: StatsData | null
  loading: boolean
  onRefresh: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [genCategory, setGenCategory] = useState('')
  const [batchCount, setBatchCount] = useState(2)
  const [batchCategory, setBatchCategory] = useState('')
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [genHistory, setGenHistory] = useState<Array<{
    id: string
    title: string
    category: string
    createdAt: string
    imageSource: string
  }> | null>(null)

  // Fetch generation history
  useEffect(() => {
    if (!loading) {
      fetch('/api/news?limit=10&sort=trending')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.articles) {
            setGenHistory(data.articles.map((a: Article) => ({
              id: a.id,
              title: a.title,
              category: a.category,
              createdAt: a.createdAt,
              imageSource: '',
            })))
          }
        })
        .catch(() => { })
    }
  }, [loading])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const url = genCategory
        ? `/api/news/auto-generate?category=${encodeURIComponent(genCategory)}`
        : '/api/news/auto-generate'
      const res = await fetch(url, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Artikel "${data.article?.title}" berhasil dibuat!`)
        onRefresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Gagal membuat artikel')
      }
    } catch {
      toast.error('Gagal membuat artikel')
    } finally {
      setGenerating(false)
    }
  }, [genCategory, onRefresh])

  const handleBatchGenerate = useCallback(async () => {
    setBatchGenerating(true)
    try {
      const res = await fetch('/api/admin/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: batchCount,
          category: batchCategory || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.succeeded} dari ${data.total} artikel berhasil dibuat!`)
        onRefresh()
      } else {
        toast.error('Gagal batch generate')
      }
    } catch {
      toast.error('Gagal batch generate')
    } finally {
      setBatchGenerating(false)
    }
  }, [batchCount, batchCategory, onRefresh])

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Generate Controls */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-neon" />
            Generate Artikel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={genCategory} onValueChange={setGenCategory}>
              <SelectTrigger className="h-9 bg-surface/50 border-border/30 text-sm flex-1">
                <SelectValue placeholder="Pilih kategori (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kategori</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 cursor-pointer"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Generate 1 Artikel
            </Button>
          </div>

          {generating && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-neon/5 border border-neon/10">
              <Loader2 className="w-4 h-4 text-neon animate-spin" />
              <span className="text-xs text-neon">Sedang membuat artikel...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Generate */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Hash className="w-4 h-4 text-neon" />
            Batch Generate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Jumlah: {batchCount}</Label>
              <div className="flex items-center gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setBatchCount(n)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors cursor-pointer ${batchCount === n
                        ? 'bg-neon/20 text-neon border border-neon/30'
                        : 'bg-surface/50 text-muted-foreground border border-border/30 hover:border-neon/20'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Select value={batchCategory} onValueChange={setBatchCategory}>
              <SelectTrigger className="h-9 bg-surface/50 border-border/30 text-sm w-full sm:w-44">
                <SelectValue placeholder="Kategori (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kategori</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
              className="bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 cursor-pointer"
            >
              {batchGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate {batchCount} Artikel
            </Button>
          </div>
          {batchGenerating && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-neon/5 border border-neon/10">
              <Loader2 className="w-4 h-4 text-neon animate-spin" />
              <span className="text-xs text-neon">Sedang membuat {batchCount} artikel...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Post Configuration */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-neon" />
            Auto-Post Konfigurasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Post</p>
              <p className="text-xs text-muted-foreground">Otomatis generate artikel secara berkala</p>
            </div>
            <Switch
              checked={stats?.autoPost.enabled ?? false}
              onCheckedChange={async (checked) => {
                try {
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ autoPostEnabled: checked }),
                  })
                  if (res.ok) {
                    toast.success(checked ? 'Auto-post diaktifkan' : 'Auto-post dinonaktifkan')
                    onRefresh()
                  }
                } catch {
                  toast.error('Gagal mengubah auto-post')
                }
              }}
            />
          </div>
          <Separator className="bg-border/30" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface/50 border border-border/20">
              <p className="text-[10px] text-muted-foreground mb-1">Interval</p>
              <p className="text-sm font-medium text-foreground">
                {stats?.autoPost.interval ? `${stats.autoPost.interval} menit` : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface/50 border border-border/20">
              <p className="text-[10px] text-muted-foreground mb-1">Generate Terakhir</p>
              <p className="text-sm font-medium text-foreground">
                {stats?.autoPost.lastGeneration ? timeAgo(stats.autoPost.lastGeneration) : 'Belum ada'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface/50 border border-border/20">
              <p className="text-[10px] text-muted-foreground mb-1">Artikel Hari Ini</p>
              <p className="text-sm font-medium text-neon">{stats?.autoPost.generatedToday ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-neon" />
          Riwayat Generate (10 Terakhir)
        </h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {genHistory && genHistory.length > 0 ? (
            genHistory.map((article, i) => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-surface/30 border border-border/20"
              >
                <span className="text-[10px] text-muted-foreground w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{article.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${CATEGORY_COLORS[article.category] || ''}`}>
                      {article.category}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {timeAgo(article.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Belum ada artikel</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== TAB 4: ANALYTICS ====================

function AnalyticsTab({ stats, loading }: {
  stats: StatsData | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const articlesByDay = stats?.analytics.articlesByDay ?? []
  const categoryDist = stats?.analytics.categoryDistribution ?? []
  const topArticles = stats?.analytics.topArticles ?? []

  return (
    <div className="space-y-6">
      {/* Articles by Day Chart */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neon" />
            Artikel per Hari (7 Hari Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={articlesByDay}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                  }}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                  labelFormatter={(v: string) => {
                    const d = new Date(v)
                    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {articlesByDay.map((_, index) => (
                    <Cell key={index} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon" />
            Distribusi Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDist} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryDist.map((_, index) => (
                    <Cell key={index} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Articles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 text-neon" />
          Top 5 Artikel
        </h3>
        <div className="space-y-2">
          {topArticles.length > 0 ? (
            topArticles.map((article, i) => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 border border-border/30"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                      i === 2 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30' :
                        'bg-surface/50 text-muted-foreground border border-border/30'
                  }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {article.title}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${CATEGORY_COLORS[article.category] || ''}`}>
                  {article.category}
                </Badge>
                <div className="flex items-center gap-1 text-neon shrink-0">
                  <EyeIcon className="w-3 h-3" />
                  <span className="text-xs font-medium">{formatViews(article.viewCount)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== TAB 5: SETTINGS ====================

function SettingsTab() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Form state
  const [form, setForm] = useState<SettingsData>({
    siteName: 'GOALZONE',
    siteDescription: '',
    pexelsApiKey: '',
    twitterUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    adsenseClientId: '',
    autoPostEnabled: false,
    autoPostInterval: 30,
  })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setForm(data)
      }
    } catch {
      toast.error('Gagal memuat pengaturan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Pengaturan berhasil disimpan')
        fetchSettings()
      } else {
        toast.error('Gagal menyimpan pengaturan')
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }, [form, fetchSettings])

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Site Settings */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-neon" />
            Pengaturan Situs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nama Situs</Label>
            <Input
              value={form.siteName}
              onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
              className="h-9 bg-surface/50 border-border/30 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Deskripsi Situs</Label>
            <Textarea
              value={form.siteDescription}
              onChange={(e) => setForm((f) => ({ ...f, siteDescription: e.target.value }))}
              className="bg-surface/50 border-border/30 text-sm min-h-[60px]"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pexels API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={form.pexelsApiKey}
                onChange={(e) => setForm((f) => ({ ...f, pexelsApiKey: e.target.value }))}
                className="h-9 bg-surface/50 border-border/30 text-sm pr-10"
                placeholder="Masukkan API key..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Twitter className="w-4 h-4 text-neon" />
            Link Sosial Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Twitter className="w-3 h-3" /> Twitter/X URL
            </Label>
            <Input
              value={form.twitterUrl}
              onChange={(e) => setForm((f) => ({ ...f, twitterUrl: e.target.value }))}
              className="h-9 bg-surface/50 border-border/30 text-sm"
              placeholder="https://twitter.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Facebook className="w-3 h-3" /> Facebook URL
            </Label>
            <Input
              value={form.facebookUrl}
              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              className="h-9 bg-surface/50 border-border/30 text-sm"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Instagram className="w-3 h-3" /> Instagram URL
            </Label>
            <Input
              value={form.instagramUrl}
              onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
              className="h-9 bg-surface/50 border-border/30 text-sm"
              placeholder="https://instagram.com/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* AdSense */}
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Hash className="w-4 h-4 text-neon" />
            AdSense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">AdSense Client ID</Label>
            <Input
              value={form.adsenseClientId}
              onChange={(e) => setForm((f) => ({ ...f, adsenseClientId: e.target.value }))}
              className="h-9 bg-surface/50 border-border/30 text-sm"
              placeholder="ca-pub-..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 cursor-pointer min-w-32"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  )
}
