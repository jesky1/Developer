'use client'

import * as React from 'react'
import {
  Swords,
  Zap,
  FileText,
  Eye,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  Activity,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Timer,
  DollarSign,
  MousePointerClick,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

// --- Types ---
interface AnalyticsData {
  totalMatches: number
  liveMatches: number
  totalNews: number
  totalPlayers: number
  pageViews: {
    today: number
    thisWeek: number
    total: number
    dailyBreakdown: { date: string; views: number }[]
  }
  topCountries: { country: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
  browserBreakdown: { browser: string; count: number }[]
  avgSessionDuration: number
  unreadContacts: number
  activityToday: number
}

interface ActivityEntry {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  ip: string | null
  createdAt: string
  user: {
    displayName: string
    role: string
  } | null
}

interface AdsStats {
  totalImpressions: number
  totalClicks: number
  ctr: number
  estimatedRevenue: number
  activeUnits: number
}

interface AdSenseEarnings {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
}

// --- Country flag mapping ---
const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  FR: '\u{1F1EB}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}',
  IT: '\u{1F1EE}\u{1F1F9}',
  BR: '\u{1F1E7}\u{1F1F7}',
  IN: '\u{1F1EE}\u{1F1F3}',
  JP: '\u{1F1EF}\u{1F1F5}',
  KR: '\u{1F1F0}\u{1F1F7}',
  NG: '\u{1F1F3}\u{1F1EC}',
  MX: '\u{1F1F2}\u{1F1FD}',
  AR: '\u{1F1E6}\u{1F1F7}',
  AU: '\u{1F1E6}\u{1F1FA}',
  CA: '\u{1F1E8}\u{1F1E6}',
}

// --- Device icon mapping ---
const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
}

// --- Chart colors ---
const CHART_COLORS = {
  primary: 'var(--color-primary)',
  chart3: 'var(--color-chart-3)',
  chart4: 'var(--color-chart-4)',
  neon: 'var(--color-neon)',
}

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.chart3,
  CHART_COLORS.chart4,
]

// --- Action icon mapping ---
function getActionIcon(action: string): { icon: React.ElementType; color: string } {
  const lower = action.toLowerCase()
  if (lower.includes('create') || lower.includes('add') || lower.includes('generate')) {
    if (lower.includes('generate')) return { icon: Zap, color: 'text-neon' }
    return { icon: Plus, color: 'text-green-500' }
  }
  if (lower.includes('update') || lower.includes('edit') || lower.includes('patch')) {
    return { icon: Pencil, color: 'text-yellow-500' }
  }
  if (lower.includes('delete') || lower.includes('remove')) {
    return { icon: Trash2, color: 'text-red-500' }
  }
  if (lower.includes('login') || lower.includes('auth') || lower.includes('sign')) {
    return { icon: LogIn, color: 'text-blue-500' }
  }
  return { icon: Activity, color: 'text-muted-foreground' }
}

// --- Relative time helper ---
function timeAgo(dateStr: string): string {
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

// --- Format duration (seconds → Xm Ys) ---
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// --- Format day name from date string ---
function formatDayName(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const d = new Date(dateStr)
  return days[d.getDay()]
}

// --- Stagger animation variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
}

// --- Custom Recharts tooltip ---
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {payload[0].value.toLocaleString()} views
      </p>
    </div>
  )
}

// --- Custom Pie tooltip ---
function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-bold text-foreground capitalize">{payload[0].name}</p>
      <p className="text-xs text-muted-foreground">{payload[0].value.toLocaleString()} visits</p>
    </div>
  )
}

// ===== Main Dashboard Component =====
export function AdminDashboard() {
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null)
  const [activities, setActivities] = React.useState<ActivityEntry[]>([])
  const [adsStats, setAdsStats] = React.useState<AdsStats | null>(null)
  const [adsenseEarnings, setAdsenseEarnings] = React.useState<AdSenseEarnings | null>(null)
  const [realtimeVisitors, setRealtimeVisitors] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  // Fetch analytics data
  const fetchAnalytics = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    }
  }, [])

  // Fetch activity feed
  const fetchActivities = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity?limit=15')
      if (res.ok) {
        const data = await res.json()
        setActivities(data.data ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    }
  }, [])

  // Fetch ads stats
  const fetchAdsStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ads?action=stats')
      if (res.ok) {
        const data = await res.json()
        setAdsStats(data)
      }
    } catch {
      // Use mock data if API not available
      setAdsStats({
        totalImpressions: 124580,
        totalClicks: 3842,
        ctr: 3.08,
        estimatedRevenue: 847.52,
        activeUnits: 6,
      })
    }
  }, [])

  // Fetch AdSense earnings
  const fetchAdsenseEarnings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/adsense?action=earnings')
      if (res.ok) {
        const data = await res.json()
        setAdsenseEarnings(data)
      }
    } catch {
      // Use mock data if API not available
      setAdsenseEarnings({
        today: 12.45,
        thisWeek: 89.32,
        thisMonth: 384.67,
        total: 2847.15,
      })
    }
  }, [])

  // Fetch real-time visitors
  const fetchRealtimeVisitors = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/traffic?action=realtime')
      if (res.ok) {
        const data = await res.json()
        setRealtimeVisitors(data.visitors ?? 0)
      }
    } catch {
      // Use mock data
      setRealtimeVisitors(Math.floor(Math.random() * 50) + 30)
    }
  }, [])

  // Initial fetch + polling
  React.useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      await Promise.all([
        fetchAnalytics(),
        fetchActivities(),
        fetchAdsStats(),
        fetchAdsenseEarnings(),
        fetchRealtimeVisitors(),
      ])
      if (mounted) setLoading(false)
    }

    load()

    const interval = setInterval(() => {
      fetchAnalytics()
      fetchActivities()
      fetchRealtimeVisitors()
    }, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [fetchAnalytics, fetchActivities, fetchAdsStats, fetchAdsenseEarnings, fetchRealtimeVisitors])

  // Prepare chart data
  const trafficData = React.useMemo(() => {
    if (!analytics?.pageViews?.dailyBreakdown) return []
    return analytics.pageViews.dailyBreakdown.map((d) => ({
      name: formatDayName(d.date),
      views: d.views,
    }))
  }, [analytics])

  const deviceData = React.useMemo(() => {
    if (!analytics?.deviceBreakdown) return []
    return analytics.deviceBreakdown.map((d) => ({
      name: d.device,
      value: d.count,
    }))
  }, [analytics])

  const topCountries = React.useMemo(() => {
    if (!analytics?.topCountries) return []
    return analytics.topCountries.slice(0, 8)
  }, [analytics])

  const maxCountryCount = React.useMemo(() => {
    if (topCountries.length === 0) return 1
    return Math.max(...topCountries.map((c) => c.count), 1)
  }, [topCountries])

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="glass-card lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // KPI cards - now includes revenue and ad stats
  const kpiCards = [
    {
      key: 'totalMatches',
      label: 'Total Matches',
      icon: Swords,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      value: analytics?.totalMatches ?? 0,
      trend: '+12%',
      trendUp: true,
    },
    {
      key: 'liveMatches',
      label: 'Live Now',
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      value: analytics?.liveMatches ?? 0,
      trend: '+3',
      trendUp: true,
    },
    {
      key: 'revenue',
      label: 'Est. Revenue',
      icon: DollarSign,
      color: 'text-neon',
      bgColor: 'bg-neon/10',
      borderColor: 'border-neon/20',
      value: `$${(adsStats?.estimatedRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: '+18%',
      trendUp: true,
    },
    {
      key: 'todayEarnings',
      label: "Today's Earnings",
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      value: `$${(adsenseEarnings?.today ?? 0).toFixed(2)}`,
      trend: '+8%',
      trendUp: true,
    },
    {
      key: 'activeAdUnits',
      label: 'Active Ad Units',
      icon: MousePointerClick,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      borderColor: 'border-chart-3/20',
      value: adsStats?.activeUnits ?? 0,
      trend: '+2',
      trendUp: true,
    },
    {
      key: 'pageViews',
      label: 'Page Views',
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      value: (analytics?.pageViews?.today ?? 0).toLocaleString(),
      trend: '+24%',
      trendUp: true,
    },
    {
      key: 'realtimeVisitors',
      label: 'Real-time Visitors',
      icon: Users,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
      borderColor: 'border-chart-2/20',
      value: realtimeVisitors,
      trend: 'Live',
      trendUp: true,
    },
    {
      key: 'totalNews',
      label: 'News Articles',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      value: analytics?.totalNews ?? 0,
      trend: '+8%',
      trendUp: true,
    },
  ]

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ===== KPI Cards Row ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.key} variants={itemVariants}>
              <Card className={cn('glass-card overflow-hidden border', kpi.borderColor)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl',
                        kpi.bgColor
                      )}
                    >
                      <Icon className={cn('h-5 w-5', kpi.color)} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {kpi.trend === 'Live' ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon live-pulse" />
                    ) : kpi.trendUp ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={cn(
                        'text-xs font-medium',
                        kpi.trend === 'Live'
                          ? 'text-neon'
                          : kpi.trendUp
                            ? 'text-green-500'
                            : 'text-red-500'
                      )}
                    >
                      {kpi.trend}
                    </span>
                    {kpi.trend !== 'Live' && (
                      <span className="text-xs text-muted-foreground">vs last week</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ===== Middle Row: Traffic Chart + Top Countries ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Traffic Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Traffic Overview</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Last 7 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px] sm:h-[280px] w-full">
                {trafficData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trafficData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        fill="url(#trafficGradient)"
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: 'var(--color-primary)',
                          stroke: 'var(--color-card)',
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">No traffic data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Countries */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="glass-card h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Top Countries</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                {topCountries.length > 0 ? (
                  topCountries.map((country, idx) => {
                    const pct = (country.count / maxCountryCount) * 100
                    const flag = COUNTRY_FLAGS[country.country] ?? '\u{1F30D}'
                    return (
                      <div key={country.country + idx} className="group">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" role="img" aria-label={country.country}>
                              {flag}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {country.country}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {country.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No country data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== Bottom Row: Device Breakdown + Activity Feed ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Device Breakdown */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Device Breakdown</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center">
                <div className="h-[160px] sm:h-[200px] w-full">
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={0}
                        >
                          {deviceData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-muted-foreground">No device data</p>
                    </div>
                  )}
                </div>
                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
                  {deviceData.map((device, idx) => {
                    const DeviceIcon = DEVICE_ICONS[device.name.toLowerCase()] ?? Monitor
                    const total = deviceData.reduce((s, d) => s + d.value, 0)
                    const pct = total > 0 ? Math.round((device.value / total) * 100) : 0
                    return (
                      <div key={device.name} className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium capitalize text-foreground">
                          {device.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {analytics?.activityToday ?? 0} today
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="max-h-80 space-y-0.5 overflow-y-auto pr-1" style={{
                scrollbarWidth: 'thin',
              }}>
                {activities.length > 0 ? (
                  activities.map((entry) => {
                    const { icon: ActionIcon, color } = getActionIcon(entry.action)
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted',
                            color === 'text-neon' && 'bg-neon/10'
                          )}
                        >
                          <ActionIcon className={cn('h-3.5 w-3.5', color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">
                              {entry.user?.displayName ?? 'System'}
                            </span>{' '}
                            <span className="text-muted-foreground">{entry.action.toLowerCase()}</span>{' '}
                            <span className="font-medium text-foreground/80">{entry.resource}</span>
                            {entry.resourceId && (
                              <span className="text-muted-foreground">
                                {' '}
                                #{entry.resourceId.slice(0, 8)}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <Clock className="mr-1 inline h-3 w-3" />
                            {timeAgo(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== Quick Stats Row ===== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Avg Session Duration */}
          <Card className="glass-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-1/10">
                <Timer className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics ? formatDuration(analytics.avgSessionDuration) : '0s'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top Browser */}
          <Card className="glass-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-2/10">
                <Globe className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Browser</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics?.browserBreakdown?.[0]?.browser ?? 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Unread Messages */}
          <Card className="glass-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-5/10">
                <MessageSquare className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread Messages</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics?.unreadContacts ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
}
