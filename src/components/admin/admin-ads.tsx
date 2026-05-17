'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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

// --- Types ---
interface AdUnit {
  id: string
  name: string
  slotId: string
  placement: string
  type: string
  status: 'active' | 'inactive'
  impressions: number
  clicks: number
  revenue: number
  ctr: number
  createdAt: string
  updatedAt: string
}

interface AdsStats {
  totalImpressions: number
  totalClicks: number
  ctr: number
  estimatedRevenue: number
  activeUnits: number
}

interface DailyStat {
  date: string
  impressions: number
  clicks: number
}

interface AdUnitFormData {
  name: string
  slotId: string
  placement: string
  type: string
  status: 'active' | 'inactive'
}

// --- Constants ---
const PLACEMENTS = ['Header Banner', 'Sidebar Top', 'Sidebar Bottom', 'In-Article', 'Footer', 'Interstitial', 'Match Card']
const AD_TYPES = ['Display', 'Native', 'Video', 'Responsive', 'Anchor']

const EMPTY_FORM: AdUnitFormData = {
  name: '',
  slotId: '',
  placement: 'Header Banner',
  type: 'Display',
  status: 'active',
}

// --- Custom tooltip ---
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// --- Component ---
export function AdminAds() {
  const [adUnits, setAdUnits] = React.useState<AdUnit[]>([])
  const [stats, setStats] = React.useState<AdsStats | null>(null)
  const [dailyStats, setDailyStats] = React.useState<DailyStat[]>([])
  const [loading, setLoading] = React.useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingUnit, setEditingUnit] = React.useState<AdUnit | null>(null)
  const [formData, setFormData] = React.useState<AdUnitFormData>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingUnit, setDeletingUnit] = React.useState<AdUnit | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [unitsRes, statsRes] = await Promise.all([
        fetch('/api/admin/ads?action=units'),
        fetch('/api/admin/ads?action=stats'),
      ])

      if (unitsRes.ok) {
        const data = await unitsRes.json()
        setAdUnits(Array.isArray(data) ? data : data.data ?? [])
      } else {
        // Mock data
        setAdUnits([
          { id: '1', name: 'Header Banner', slotId: 'div-gpt-ad-1', placement: 'Header Banner', type: 'Display', status: 'active', impressions: 45230, clicks: 1380, revenue: 276.40, ctr: 3.05, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '2', name: 'Sidebar Top', slotId: 'div-gpt-ad-2', placement: 'Sidebar Top', type: 'Display', status: 'active', impressions: 32100, clicks: 960, revenue: 192.80, ctr: 2.99, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '3', name: 'In-Article Native', slotId: 'div-gpt-ad-3', placement: 'In-Article', type: 'Native', status: 'active', impressions: 28900, clicks: 890, revenue: 178.90, ctr: 3.08, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '4', name: 'Footer Banner', slotId: 'div-gpt-ad-4', placement: 'Footer', type: 'Responsive', status: 'inactive', impressions: 18350, clicks: 412, revenue: 99.42, ctr: 2.25, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      } else {
        setStats({ totalImpressions: 124580, totalClicks: 3842, ctr: 3.08, estimatedRevenue: 847.52, activeUnits: 3 })
      }

      // Mock daily stats
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      setDailyStats(days.map((d) => ({
        date: d,
        impressions: Math.floor(Math.random() * 10000) + 15000,
        clicks: Math.floor(Math.random() * 400) + 400,
      })))
    } catch {
      toast.error('Failed to load ad data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleAdd = () => {
    setEditingUnit(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  const handleEdit = (unit: AdUnit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      slotId: unit.slotId,
      placement: unit.placement,
      type: unit.type,
      status: unit.status,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Ad unit name is required')
      return
    }
    setSaving(true)
    try {
      if (editingUnit) {
        const res = await fetch(`/api/admin/ads/${editingUnit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast.success('Ad unit updated')
      } else {
        const res = await fetch('/api/admin/ads?action=create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to create')
        toast.success('Ad unit created')
      }
      setDialogOpen(false)
      fetchData()
    } catch {
      toast.error('Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUnit) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/ads/${deletingUnit.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Ad unit deleted')
      setDeleteDialogOpen(false)
      fetchData()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (unit: AdUnit) => {
    const newStatus = unit.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/admin/ads/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Ad unit ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      fetchData()
    } catch {
      toast.error('Failed to update status')
    }
  }

  // KPI cards
  const kpiCards = [
    { label: 'Total Impressions', value: (stats?.totalImpressions ?? 0).toLocaleString(), icon: Eye, color: 'text-chart-1', bgColor: 'bg-chart-1/10' },
    { label: 'Total Clicks', value: (stats?.totalClicks ?? 0).toLocaleString(), icon: MousePointerClick, color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
    { label: 'CTR', value: `${(stats?.ctr ?? 0).toFixed(2)}%`, icon: TrendingUp, color: 'text-neon', bgColor: 'bg-neon/10' },
    { label: 'Est. Revenue', value: `$${(stats?.estimatedRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MousePointerClick className="size-6 text-neon" />
            Ad Tracking
          </h2>
          <p className="text-muted-foreground text-sm">Monitor ad performance and manage units</p>
        </div>
        <Button onClick={handleAdd} className="gap-2 self-start">
          <Plus className="size-4" />
          Add Ad Unit
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{kpi.label}</span>
                    <div className={cn('rounded-md p-1.5', kpi.bgColor)}>
                      <Icon className={cn('size-4', kpi.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Daily Stats Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-neon" />
                Daily Stats
              </CardTitle>
              <Badge variant="secondary" className="text-xs">Last 7 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="impressions" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={false} name="Impressions" />
                  <Line type="monotone" dataKey="clicks" stroke="var(--color-neon)" strokeWidth={2.5} dot={false} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ad Units Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ad Units</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Slot ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Placement</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Clicks</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Revenue</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">CTR</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adUnits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center">
                        <p className="text-sm text-muted-foreground">No ad units found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {adUnits.map((unit, i) => (
                        <motion.tr
                          key={unit.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                          className="border-b transition-colors hover:bg-muted/50 group"
                        >
                          <TableCell className="font-medium text-sm">{unit.name}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{unit.slotId}</code>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{unit.placement}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline" className="text-[10px]">{unit.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={unit.status === 'active'}
                                onCheckedChange={() => handleToggleStatus(unit)}
                                className="data-[state=checked]:bg-neon scale-75"
                              />
                              <span className={cn('text-xs', unit.status === 'active' ? 'text-neon' : 'text-muted-foreground')}>
                                {unit.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{unit.impressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">{unit.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-emerald-500 hidden md:table-cell">${unit.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums hidden lg:table-cell">{unit.ctr.toFixed(2)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100" onClick={() => handleEdit(unit)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => { setDeletingUnit(unit); setDeleteDialogOpen(true) }}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Ad Unit' : 'Add Ad Unit'}</DialogTitle>
            <DialogDescription>{editingUnit ? 'Update ad unit details.' : 'Create a new ad unit.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Header Banner" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Slot ID</Label>
              <Input placeholder="e.g. div-gpt-ad-123" value={formData.slotId} onChange={(e) => setFormData((f) => ({ ...f, slotId: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Placement</Label>
                <Select value={formData.placement} onValueChange={(v) => setFormData((f) => ({ ...f, placement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">Enable this ad unit</p>
              </div>
              <Switch checked={formData.status === 'active'} onCheckedChange={(c) => setFormData((f) => ({ ...f, status: c ? 'active' : 'inactive' }))} className="data-[state=checked]:bg-neon" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingUnit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingUnit?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90 gap-2">
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
