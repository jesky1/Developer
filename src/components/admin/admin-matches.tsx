'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Flame,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Types
interface MatchData {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  status: string
  homeScore: number
  awayScore: number
  minute: number
  stadium: string
  kickoff: string
  isHot: boolean
  homeLogo: string
  awayLogo: string
  leagueLogo: string
  events: unknown[]
  homeForm: string[]
  awayForm: string[]
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

const LEAGUES = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Champions League',
]

const STATUSES = ['LIVE', 'HT', 'FT', 'UPCOMING']

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  LIVE: {
    label: 'LIVE',
    className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    dotClass: 'bg-emerald-500 live-pulse',
  },
  HT: {
    label: 'HT',
    className: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    dotClass: 'bg-yellow-500',
  },
  FT: {
    label: 'FT',
    className: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  },
  UPCOMING: {
    label: 'UPCOMING',
    className: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
    dotClass: 'bg-sky-500',
  },
}

interface MatchFormData {
  homeTeam: string
  awayTeam: string
  league: string
  status: string
  minute: number
  homeScore: number
  awayScore: number
  stadium: string
  kickoff: string
  isHot: boolean
}

const EMPTY_FORM: MatchFormData = {
  homeTeam: '',
  awayTeam: '',
  league: 'Premier League',
  status: 'UPCOMING',
  minute: 0,
  homeScore: 0,
  awayScore: 0,
  stadium: '',
  kickoff: '',
  isHot: false,
}

export default function AdminMatches() {
  // State
  const [matches, setMatches] = useState<MatchData[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [leagueFilter, setLeagueFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchData | null>(null)
  const [formData, setFormData] = useState<MatchFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingMatch, setDeletingMatch] = useState<MatchData | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      })
      if (statusFilter) params.set('status', statusFilter)
      if (leagueFilter) params.set('league', leagueFilter)

      const res = await fetch(`/api/admin/matches?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setMatches(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 })
    } catch {
      toast.error('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, leagueFilter])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, leagueFilter])

  // Open create dialog
  const handleCreate = () => {
    setEditingMatch(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (match: MatchData) => {
    setEditingMatch(match)
    setFormData({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      status: match.status,
      minute: match.minute,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stadium: match.stadium,
      kickoff: match.kickoff,
      isHot: match.isHot,
    })
    setDialogOpen(true)
  }

  // Open delete dialog
  const handleDelete = (match: MatchData) => {
    setDeletingMatch(match)
    setDeleteDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!formData.homeTeam.trim() || !formData.awayTeam.trim()) {
      toast.error('Team names are required')
      return
    }

    try {
      setSubmitting(true)
      if (editingMatch) {
        // Update
        const res = await fetch(`/api/admin/matches/${editingMatch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast.success('Match updated successfully')
      } else {
        // Create
        const res = await fetch('/api/admin/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to create')
        toast.success('Match created successfully')
      }
      setDialogOpen(false)
      fetchMatches()
    } catch {
      toast.error(editingMatch ? 'Failed to update match' : 'Failed to create match')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingMatch) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/admin/matches/${deletingMatch.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Match deleted successfully')
      setDeleteDialogOpen(false)
      fetchMatches()
    } catch {
      toast.error('Failed to delete match')
    } finally {
      setDeleting(false)
    }
  }

  // Filter matches by search query (client-side)
  const filteredMatches = searchQuery.trim()
    ? matches.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.league.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : matches

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Match Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage all football matches — {pagination.total} total
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 self-start">
          <Plus className="size-4" />
          Add Match
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <Tabs
            value={statusFilter || 'ALL'}
            onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}
          >
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="LIVE" className="gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 live-pulse" />
                Live
              </TabsTrigger>
              <TabsTrigger value="HT">HT</TabsTrigger>
              <TabsTrigger value="FT">FT</TabsTrigger>
              <TabsTrigger value="UPCOMING">Upcoming</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-full sm:w-48"
              />
            </div>

            {/* League Filter */}
            <Select value={leagueFilter || 'ALL'} onValueChange={(v) => setLeagueFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="All Leagues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Leagues</SelectItem>
                {LEAGUES.map((league) => (
                  <SelectItem key={league} value={league}>
                    {league}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="ghost" size="icon" onClick={fetchMatches} className="size-9 shrink-0">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Home Team</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Score</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Away Team</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">League</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Min</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Hot</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredMatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">No matches found</p>
                    <Button variant="outline" size="sm" onClick={handleCreate} className="gap-1">
                      <Plus className="size-3" />
                      Add a match
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredMatches.map((match) => {
                  const statusCfg = STATUS_CONFIG[match.status] || STATUS_CONFIG.UPCOMING
                  const isLive = match.status === 'LIVE'
                  const isHot = match.isHot

                  return (
                    <motion.tr
                      key={match.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className={`border-b border-border transition-colors hover:bg-muted/30 ${
                        isLive ? 'border-l-2 border-l-emerald-500' : ''
                      } ${isHot ? 'border-l-2 border-l-orange-500' : ''}`}
                    >
                      <TableCell className="font-medium">{match.homeTeam}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg font-bold tabular-nums tracking-wide">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{match.awayTeam}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1.5 text-xs ${statusCfg.className}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusCfg.dotClass}`} />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{match.league}</span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {match.status === 'LIVE' || match.status === 'HT' ? (
                          <span className="text-sm font-medium">{match.minute}&apos;</span>
                        ) : match.kickoff ? (
                          <span className="text-muted-foreground text-xs">{match.kickoff}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isHot ? (
                          <Flame className="size-4 text-orange-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleEdit(match)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(match)}
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

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of{' '}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="gap-1"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMatch ? 'Edit Match' : 'Add New Match'}</DialogTitle>
            <DialogDescription>
              {editingMatch
                ? 'Update the match details below.'
                : 'Fill in the details to create a new match.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Teams Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeTeam">Home Team *</Label>
                <Input
                  id="homeTeam"
                  placeholder="e.g. Arsenal"
                  value={formData.homeTeam}
                  onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayTeam">Away Team *</Label>
                <Input
                  id="awayTeam"
                  placeholder="e.g. Chelsea"
                  value={formData.awayTeam}
                  onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                />
              </div>
            </div>

            {/* League + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>League</Label>
                <Select
                  value={formData.league}
                  onValueChange={(v) => setFormData({ ...formData, league: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAGUES.map((league) => (
                      <SelectItem key={league} value={league}>
                        {league}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">Home Score</Label>
                <Input
                  id="homeScore"
                  type="number"
                  min={0}
                  value={formData.homeScore}
                  onChange={(e) =>
                    setFormData({ ...formData, homeScore: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayScore">Away Score</Label>
                <Input
                  id="awayScore"
                  type="number"
                  min={0}
                  value={formData.awayScore}
                  onChange={(e) =>
                    setFormData({ ...formData, awayScore: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Minute + Stadium */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minute">Minute</Label>
                <Input
                  id="minute"
                  type="number"
                  min={0}
                  max={120}
                  value={formData.minute}
                  onChange={(e) =>
                    setFormData({ ...formData, minute: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stadium">Stadium</Label>
                <Input
                  id="stadium"
                  placeholder="e.g. Emirates Stadium"
                  value={formData.stadium}
                  onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                />
              </div>
            </div>

            {/* Kickoff */}
            <div className="space-y-2">
              <Label htmlFor="kickoff">Kickoff Time</Label>
              <Input
                id="kickoff"
                placeholder="e.g. 20:00 or 2025-01-15T20:00"
                value={formData.kickoff}
                onChange={(e) => setFormData({ ...formData, kickoff: e.target.value })}
              />
            </div>

            {/* Hot Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Flame className="size-4 text-orange-500" />
                  Hot Match
                </Label>
                <p className="text-muted-foreground text-sm">
                  Highlight this match as a featured hot match
                </p>
              </div>
              <Switch
                checked={formData.isHot}
                onCheckedChange={(checked) => setFormData({ ...formData, isHot: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {editingMatch ? 'Update Match' : 'Create Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Match</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the match{' '}
              <span className="font-semibold text-foreground">
                {deletingMatch?.homeTeam} vs {deletingMatch?.awayTeam}
              </span>
              ? This action cannot be undone and will also remove any associated poll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
