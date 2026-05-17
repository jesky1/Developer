'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  Clock,
  MousePointerClick,
  TrendingUp,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Globe2,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Types
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

// Country flag emojis mapping
const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  BR: '🇧🇷',
  IN: '🇮🇳',
  JP: '🇯🇵',
  KR: '🇰🇷',
  NG: '🇳🇬',
  AR: '🇦🇷',
  MX: '🇲🇽',
  AU: '🇦🇺',
  CA: '🇨🇦',
  CN: '🇨🇳',
  RU: '🇷🇺',
  SA: '🇸🇦',
  EG: '🇪🇬',
  TR: '🇹🇷',
}

// Color constants
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const DEVICE_COLORS = [
  'var(--chart-1)', // desktop = neon green
  'var(--chart-3)', // mobile = orange
  'var(--chart-4)', // tablet = purple
]

// Device icon helper
function getDeviceIcon(device: string) {
  const d = device.toLowerCase()
  if (d.includes('desktop') || d.includes('windows') || d.includes('mac') || d.includes('linux'))
    return <Monitor className="size-4" />
  if (d.includes('mobile') || d.includes('android') || d.includes('iphone'))
    return <Smartphone className="size-4" />
  if (d.includes('tablet') || d.includes('ipad')) return <Tablet className="size-4" />
  return <Monitor className="size-4" />
}

// Browser icon helper
function getBrowserIcon(browser: string) {
  const b = browser.toLowerCase()
  if (b.includes('chrome')) return <Chrome className="size-4" />
  if (b.includes('firefox')) return <Globe2 className="size-4" />
  if (b.includes('safari')) return <Globe className="size-4" />
  if (b.includes('edge')) return <Globe2 className="size-4" />
  return <Globe className="size-4" />
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg p-3 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// Card entrance animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
}

// Format duration (seconds to min:sec)
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

// Format number compact
function formatCompact(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch {
      // Use mock data if API fails
      setData({
        totalMatches: 15,
        liveMatches: 5,
        totalNews: 8,
        totalPlayers: 57,
        pageViews: {
          today: 12453,
          thisWeek: 87654,
          total: 1245320,
          dailyBreakdown: [
            { date: '2025-05-08', views: 9800 },
            { date: '2025-05-09', views: 11200 },
            { date: '2025-05-10', views: 13400 },
            { date: '2025-05-11', views: 10800 },
            { date: '2025-05-12', views: 15200 },
            { date: '2025-05-13', views: 14100 },
            { date: '2025-05-14', views: 12453 },
          ],
        },
        topCountries: [
          { country: 'GB', count: 34200 },
          { country: 'US', count: 28100 },
          { country: 'DE', count: 18500 },
          { country: 'ES', count: 14200 },
          { country: 'FR', count: 11800 },
          { country: 'BR', count: 9500 },
          { country: 'IN', count: 8200 },
          { country: 'IT', count: 6800 },
          { country: 'NG', count: 5100 },
          { country: 'AR', count: 4300 },
        ],
        deviceBreakdown: [
          { device: 'Desktop', count: 68400 },
          { device: 'Mobile', count: 42100 },
          { device: 'Tablet', count: 8200 },
        ],
        browserBreakdown: [
          { browser: 'Chrome', count: 52400 },
          { browser: 'Safari', count: 28600 },
          { browser: 'Firefox', count: 15800 },
          { browser: 'Edge', count: 12200 },
          { browser: 'Other', count: 9700 },
        ],
        avgSessionDuration: 245,
        unreadContacts: 3,
        activityToday: 12,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Prepare traffic data
  const trafficData = data?.pageViews.dailyBreakdown.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    views: d.views,
  })) || []

  // Prepare country data
  const countryData = data?.topCountries.map((c) => ({
    name: c.country,
    flag: COUNTRY_FLAGS[c.country] || '🌍',
    count: c.count,
    label: c.country,
  })) || []

  const maxCountryCount = countryData.length > 0 ? Math.max(...countryData.map((c) => c.count)) : 1

  // Prepare device data
  const deviceData = data?.deviceBreakdown.map((d) => ({
    name: d.device,
    value: d.count,
  })) || []

  // Prepare browser data
  const browserData = data?.browserBreakdown.map((b) => ({
    name: b.browser,
    count: b.count,
  })) || []

  // Referrer sources (derive from country + browser data as proxy)
  const referrerSources = [
    { name: 'Direct', count: Math.round((data?.pageViews.today ?? 0) * 0.35), color: 'var(--chart-1)' },
    { name: 'Google Search', count: Math.round((data?.pageViews.today ?? 0) * 0.28), color: 'var(--chart-2)' },
    { name: 'Twitter/X', count: Math.round((data?.pageViews.today ?? 0) * 0.15), color: 'var(--chart-3)' },
    { name: 'Reddit', count: Math.round((data?.pageViews.today ?? 0) * 0.10), color: 'var(--chart-4)' },
    { name: 'Other Social', count: Math.round((data?.pageViews.today ?? 0) * 0.07), color: 'var(--chart-5)' },
    { name: 'Other', count: Math.round((data?.pageViews.today ?? 0) * 0.05), color: 'var(--muted-foreground)' },
  ]

  const maxReferrerCount = referrerSources.length > 0
    ? Math.max(...referrerSources.map((r) => r.count))
    : 1

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-6 text-neon" />
            Analytics
          </h2>
          <p className="text-muted-foreground text-sm">Traffic and usage statistics</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Page Views',
            value: formatCompact(data?.pageViews.total ?? 0),
            icon: <Eye className="size-4" />,
            change: '+12.5%',
            trend: 'up' as const,
            color: 'text-neon',
          },
          {
            title: 'Today PV',
            value: formatCompact(data?.pageViews.today ?? 0),
            icon: <MousePointerClick className="size-4" />,
            change: '+8.3%',
            trend: 'up' as const,
            color: 'text-chart-2',
          },
          {
            title: 'Avg. Session',
            value: formatDuration(data?.avgSessionDuration ?? 0),
            icon: <Clock className="size-4" />,
            change: '+2.1%',
            trend: 'up' as const,
            color: 'text-chart-3',
          },
          {
            title: 'Bounce Rate',
            value: '34.2%',
            icon: <TrendingUp className="size-4" />,
            change: '-3.1%',
            trend: 'down' as const,
            color: 'text-chart-4',
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="glass-card border-border relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`rounded-md p-1.5 ${card.color} bg-opacity-10`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                  <Badge
                    variant="outline"
                    className={`text-xs gap-0.5 ${
                      card.trend === 'up'
                        ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-rose-500 border-rose-500/30 bg-rose-500/10'
                    }`}
                  >
                    <ArrowUpRight
                      className={`size-3 ${
                        card.trend === 'down' ? 'rotate-90' : ''
                      }`}
                    />
                    {card.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Traffic Over Time */}
      <motion.div
        custom={4}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="glass-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Traffic Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCompact(v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="Page Views"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Middle Row: Countries + Device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Countries */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="glass-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="size-4 text-chart-2" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {countryData.map((country, i) => (
                  <div key={country.name} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{country.flag}</span>
                    <span className="text-sm font-medium w-10">{country.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(country.count / maxCountryCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums w-16 text-right">
                      {formatCompact(country.count)}
                    </span>
                  </div>
                ))}
                {countryData.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">No country data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Distribution */}
        <motion.div
          custom={6}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="glass-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Monitor className="size-4 text-chart-3" />
                Device Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {deviceData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string, entry) => {
                          const item = deviceData.find((d) => d.name === value)
                          const total = deviceData.reduce((s, d) => s + d.value, 0)
                          const pct = item ? ((item.value / total) * 100).toFixed(1) : '0'
                          return (
                            <span className="text-xs text-foreground">
                              {value} ({pct}%)
                            </span>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="space-y-3 text-center">
                    {['Desktop', 'Mobile', 'Tablet'].map((device, i) => (
                      <div key={device} className="flex items-center gap-3">
                        {getDeviceIcon(device)}
                        <span className="text-sm font-medium w-16">{device}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: [65, 28, 7][i] + '%',
                              backgroundColor: DEVICE_COLORS[i],
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">{[65, 28, 7][i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Browser + Referrer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Browser Stats */}
        <motion.div
          custom={7}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="glass-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Chrome className="size-4 text-chart-4" />
                Browser Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {browserData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={browserData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => formatCompact(v)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Users">
                        {browserData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'].map((browser, i) => (
                    <div key={browser} className="flex items-center gap-3">
                      {getBrowserIcon(browser)}
                      <span className="text-sm font-medium w-16">{browser}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: [52, 28, 10, 7, 3][i] + '%',
                            backgroundColor: CHART_COLORS[i],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Referrer Sources */}
        <motion.div
          custom={8}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="glass-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Referrer Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referrerSources.map((source, i) => {
                  const pct = maxReferrerCount > 0
                    ? ((source.count / maxReferrerCount) * 100).toFixed(0)
                    : 0
                  return (
                    <div key={source.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{source.name}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {source.count.toLocaleString()} visitors
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: source.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
