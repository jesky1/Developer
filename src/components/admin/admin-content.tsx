'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Newspaper,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

// ===== Types =====
interface NewsArticle {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  category: string
  imageUrl: string
  source: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  league: string
  matchId: string | null
  isAiGenerated: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

interface ArticleFormData {
  title: string
  summary: string
  content: string
  category: string
  tags: string
  league: string
  imageUrl: string
  seoTitle: string
  seoDescription: string
}

// ===== Category configs =====
const categories = [
  'All',
  'Breaking',
  'Match Report',
  'Analysis',
  'Transfer',
  'Preview',
  'Rumor',
] as const

type Category = (typeof categories)[number]

const categoryConfig: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  Breaking: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30', accent: 'border-l-red-500' },
  'Match Report': { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/30', accent: 'border-l-emerald-500' },
  Analysis: { bg: 'bg-sky-500/15', text: 'text-sky-500', border: 'border-sky-500/30', accent: 'border-l-sky-500' },
  Transfer: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-orange-500/30', accent: 'border-l-orange-500' },
  Preview: { bg: 'bg-purple-500/15', text: 'text-purple-500', border: 'border-purple-500/30', accent: 'border-l-purple-500' },
  Rumor: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', border: 'border-yellow-500/30', accent: 'border-l-yellow-500' },
}

const leagues = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Champions League',
  'Europa League',
  'Other',
]

// ===== Helpers =====
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid'
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  } catch {
    return 'Invalid'
  }
}

const emptyFormData: ArticleFormData = {
  title: '',
  summary: '',
  content: '',
  category: 'Transfer',
  tags: '',
  league: 'Premier League',
  imageUrl: '',
  seoTitle: '',
  seoDescription: '',
}

// ===== Component =====
interface AdminContentProps {
  onNavigateToAI?: () => void
}

export function AdminContent({ onNavigateToAI }: AdminContentProps) {
  const [articles, setArticles] = React.useState<NewsArticle[]>([])
  const [totalArticles, setTotalArticles] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [activeCategory, setActiveCategory] = React.useState<Category>('All')

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingArticle, setEditingArticle] = React.useState<NewsArticle | null>(null)
  const [formData, setFormData] = React.useState<ArticleFormData>(emptyFormData)
  const [saving, setSaving] = React.useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingArticle, setDeletingArticle] = React.useState<NewsArticle | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // AI generation
  const [generating, setGenerating] = React.useState(false)

  // Fetch articles
  const fetchArticles = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      })
      if (activeCategory !== 'All') params.set('category', activeCategory)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/news?${params}`)
      if (!res.ok) throw new Error('Failed to fetch articles')
      const data = await res.json()
      setArticles(data.data || [])
      setTotalArticles(data.pagination?.total || 0)
    } catch {
      toast.error('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [currentPage, activeCategory, search])

  React.useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const totalPages = Math.ceil(totalArticles / pageSize)

  // Open dialog for adding
  const handleAdd = () => {
    setEditingArticle(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  // Open dialog for editing
  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article)
    setFormData({
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      league: article.league,
      imageUrl: article.imageUrl,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    })
    setDialogOpen(true)
  }

  // Open delete dialog
  const handleDeleteClick = (article: NewsArticle) => {
    setDeletingArticle(article)
    setDeleteDialogOpen(true)
  }

  // Save article (create or update)
  const handleSave = async () => {
    if (!formData.title || !formData.summary) {
      toast.error('Title and summary are required')
      return
    }

    setSaving(true)
    try {
      const body = {
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        category: formData.category,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        league: formData.league,
        imageUrl: formData.imageUrl,
        seoTitle: formData.seoTitle || formData.title.slice(0, 60),
        seoDescription: formData.seoDescription || formData.summary.slice(0, 155),
      }

      if (editingArticle) {
        // Update
        const res = await fetch(`/api/admin/news/${editingArticle.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update article')
        }
        toast.success(`Article updated successfully`)
      } else {
        // Create
        const res = await fetch('/api/admin/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create article')
        }
        toast.success(`Article created successfully`)
      }
      setDialogOpen(false)
      fetchArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  // Delete article
  const handleDelete = async () => {
    if (!deletingArticle) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/news/${deletingArticle.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete article')
      }
      toast.success('Article deleted')
      setDeleteDialogOpen(false)
      setDeletingArticle(null)
      fetchArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // Generate with AI
  const handleGenerateAI = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'AI generation failed')
      }
      const result = await res.json()
      const count = result.articles?.length || 0
      toast.success(`Generated ${count} article${count !== 1 ? 's' : ''} with AI`)
      fetchArticles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ===== Render =====
  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat
            const config = cat !== 'All' ? categoryConfig[cat] : null
            return (
              <Button
                key={cat}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={`shrink-0 gap-1.5 text-xs ${
                  isActive && config
                    ? `${config.bg} ${config.text} hover:${config.bg}`
                    : ''
                }`}
                onClick={() => {
                  setActiveCategory(cat)
                  setCurrentPage(1)
                }}
              >
                {cat !== 'All' && config && (
                  <span
                    className={`size-2 rounded-full ${
                      cat === 'Breaking'
                        ? 'bg-red-500'
                        : cat === 'Match Report'
                          ? 'bg-emerald-500'
                          : cat === 'Analysis'
                            ? 'bg-sky-500'
                            : cat === 'Transfer'
                              ? 'bg-orange-500'
                              : cat === 'Preview'
                                ? 'bg-purple-500'
                                : 'bg-yellow-500'
                    }`}
                  />
                )}
                {cat}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 bg-neon/10 text-neon border-neon/30 hover:bg-neon/20"
            onClick={() => onNavigateToAI?.()}
          >
            <Zap className="size-3.5" />
            <span className="hidden sm:inline">AI Generator</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleAdd}>
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add Article</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="hidden sm:table-cell">AI</TableHead>
              <TableHead className="hidden lg:table-cell">League</TableHead>
              <TableHead className="hidden sm:table-cell">Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : articles.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Newspaper className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No articles found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || activeCategory !== 'All'
                          ? 'Try adjusting your search or category filter'
                          : 'Create your first article or generate one with AI'}
                      </p>
                    </div>
                    {!search && activeCategory === 'All' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onNavigateToAI?.()}
                          size="sm"
                          variant="outline"
                          className="gap-1.5 bg-neon/10 text-neon border-neon/30 hover:bg-neon/20"
                        >
                          <Zap className="size-3.5" />
                          AI Generator
                        </Button>
                        <Button onClick={handleAdd} size="sm" className="gap-1.5">
                          <Plus className="size-3.5" />
                          Add Article
                        </Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Article rows
              <AnimatePresence mode="popLayout">
                {articles.map((article, i) => {
                  const config = categoryConfig[article.category] || categoryConfig.Transfer
                  return (
                    <motion.tr
                      key={article.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={`border-b transition-colors hover:bg-muted/50 group border-l-4 ${config.accent}`}
                    >
                      <TableCell>
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium text-foreground max-w-[280px]">
                            {article.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground max-w-[240px]">
                            {article.summary}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${config.bg} ${config.text} ${config.border} text-[10px] whitespace-nowrap`}
                        >
                          {article.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{article.source}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {article.isAiGenerated ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]"
                          >
                            <Zap className="size-3" />
                            AI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{article.league || '-'}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span
                          className="text-xs text-muted-foreground"
                          title={formatDate(article.publishedAt || article.createdAt)}
                        >
                          {formatRelativeTime(article.publishedAt || article.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEdit(article)}
                            title="Edit article"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                            onClick={() => handleDeleteClick(article)}
                            title="Delete article"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalArticles)} of{' '}
            {totalArticles} articles
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Smart page range: always show current ± 2
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingArticle ? (
                <>
                  <Pencil className="size-5 text-neon" />
                  Edit Article
                </>
              ) : (
                <>
                  <FileText className="size-5 text-neon" />
                  Add Article
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? 'Update article details and content.'
                : 'Create a new article for the GOALZONE platform.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="art-title">Title *</Label>
              <Input
                id="art-title"
                placeholder="Article headline..."
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="art-summary">Summary *</Label>
              <Textarea
                id="art-summary"
                placeholder="Brief article summary..."
                rows={2}
                value={formData.summary}
                onChange={(e) => setFormData((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="art-content">Content</Label>
              <Textarea
                id="art-content"
                placeholder="Full article content..."
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="art-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c !== 'All')
                      .map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full ${
                                cat === 'Breaking'
                                  ? 'bg-red-500'
                                  : cat === 'Match Report'
                                    ? 'bg-emerald-500'
                                    : cat === 'Analysis'
                                      ? 'bg-sky-500'
                                      : cat === 'Transfer'
                                        ? 'bg-orange-500'
                                        : cat === 'Preview'
                                          ? 'bg-purple-500'
                                          : 'bg-yellow-500'
                              }`}
                            />
                            {cat}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="art-league">League</Label>
                <Select
                  value={formData.league}
                  onValueChange={(v) => setFormData((f) => ({ ...f, league: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map((league) => (
                      <SelectItem key={league} value={league}>
                        {league}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="art-tags">Tags</Label>
              <Input
                id="art-tags"
                placeholder="e.g. transfer, premier league, rumors (comma-separated)"
                value={formData.tags}
                onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">Separate tags with commas</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="art-image">Image URL</Label>
              <Input
                id="art-image"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                SEO Settings
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="art-seo-title">SEO Title</Label>
                  <Input
                    id="art-seo-title"
                    placeholder="Optimized title for search engines..."
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((f) => ({ ...f, seoTitle: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {formData.seoTitle.length}/60 characters
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="art-seo-desc">SEO Description</Label>
                  <Textarea
                    id="art-seo-desc"
                    placeholder="Meta description for search results..."
                    rows={2}
                    value={formData.seoDescription}
                    onChange={(e) => setFormData((f) => ({ ...f, seoDescription: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {formData.seoDescription.length}/155 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingArticle ? 'Save Changes' : 'Create Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingArticle?.title}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
