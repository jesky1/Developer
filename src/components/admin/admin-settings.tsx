'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Settings,
  Palette,
  ToggleLeft,
  Bell,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  Circle,
} from 'lucide-react'

// ---- Types ----
interface SiteSetting {
  id: string
  key: string
  value: string
  category: string
  description: string
  isPublic: boolean
  updatedAt: string
}

interface SettingWithValue extends SiteSetting {
  currentValue: string
  isDirty: boolean
}

// ---- Category config ----
const CATEGORIES = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'features', label: 'Features', icon: ToggleLeft },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'seo', label: 'SEO', icon: Search },
] as const

// Boolean setting keys
const BOOLEAN_KEYS = new Set([
  'maintenance_mode',
  'registration_enabled',
  'ai_news_enabled',
  'email_notifications',
  'push_notifications',
  'live_score_alerts',
  'seo_auto_meta',
  'seo_robots_index',
  'dark_mode_default',
  'social_login_enabled',
])

// Number setting keys
const NUMBER_KEYS = new Set([
  'max_news_per_day',
  'cache_ttl_seconds',
  'session_timeout_minutes',
  'max_login_attempts',
])

// ---- Helpers ----
function isBooleanSetting(key: string): boolean {
  return BOOLEAN_KEYS.has(key)
}

function isNumberSetting(key: string): boolean {
  return NUMBER_KEYS.has(key)
}

function formatUpdatedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function prettyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---- Component ----
export function AdminSettings() {
  const [settings, setSettings] = useState<SettingWithValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // category being saved
  const [activeTab, setActiveTab] = useState('general')

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data: SiteSetting[] = await res.json()
      setSettings(
        data.map((s) => ({
          ...s,
          currentValue: s.value,
          isDirty: false,
        }))
      )
    } catch (err) {
      console.error('Error fetching settings:', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Update a setting value locally
  const updateSetting = (key: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.key === key
          ? { ...s, currentValue: newValue, isDirty: newValue !== s.value }
          : s
      )
    )
  }

  // Save changes for a specific category
  const saveCategory = async (category: string) => {
    const dirtySettings = settings.filter(
      (s) => s.category === category && s.isDirty
    )
    if (dirtySettings.length === 0) {
      toast.info('No changes to save')
      return
    }

    setSaving(category)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: dirtySettings.map((s) => ({
            key: s.key,
            value: s.currentValue,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      const result = await res.json()

      // Update local state to reflect saved values
      setSettings((prev) =>
        prev.map((s) => {
          if (s.category === category && s.isDirty) {
            return { ...s, value: s.currentValue, isDirty: false }
          }
          return s
        })
      )

      toast.success(
        `Settings saved (${result.updated?.length ?? dirtySettings.length} updated)`,
        {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        }
      )
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error('Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  // Reset a category to original values
  const resetCategory = (category: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.category === category && s.isDirty
          ? { ...s, currentValue: s.value, isDirty: false }
          : s
      )
    )
    toast.info('Changes discarded')
  }

  // Get settings for a category
  const getCategorySettings = (category: string) =>
    settings.filter((s) => s.category === category)

  // Count dirty settings per category
  const dirtyCount = (category: string) =>
    settings.filter((s) => s.category === category && s.isDirty).length

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neon/10 border border-neon/20">
            <Settings className="w-5 h-5 text-neon" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Site Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage your GOALZONE configuration
            </p>
          </div>
        </div>
      </div>

      {/* Tabs by Category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const dirty = dirtyCount(cat.key)
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-neon/10 data-[state=active]:text-neon"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cat.label}</span>
                {dirty > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-neon/20 text-neon border-neon/30"
                  >
                    {dirty}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const catSettings = getCategorySettings(cat.key)
          const dirty = dirtyCount(cat.key)
          const isSaving = saving === cat.key

          return (
            <TabsContent key={cat.key} value={cat.key}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {catSettings.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground text-sm">
                        No settings found for this category.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  catSettings.map((setting, idx) => (
                    <motion.div
                      key={setting.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                    >
                      <Card
                        className={`glass-card transition-all duration-200 ${
                          setting.isDirty
                            ? 'border-neon/30 shadow-[0_0_12px_var(--neon-glow)]'
                            : ''
                        }`}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Label + Description */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-foreground">
                                  {prettyKey(setting.key)}
                                </Label>
                                {setting.isDirty && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-neon/40 text-neon bg-neon/5"
                                  >
                                    Modified
                                  </Badge>
                                )}
                                {setting.isPublic && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
                                  >
                                    Public
                                  </Badge>
                                )}
                              </div>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {setting.description}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                <Circle className="w-2 h-2 fill-muted-foreground/40 text-muted-foreground/40" />
                                Updated {formatUpdatedDate(setting.updatedAt)}
                              </p>
                            </div>

                            {/* Right: Input Control */}
                            <div className="flex-shrink-0 flex items-center">
                              {isBooleanSetting(setting.key) ? (
                                <Switch
                                  checked={setting.currentValue === 'true'}
                                  onCheckedChange={(checked) =>
                                    updateSetting(
                                      setting.key,
                                      checked ? 'true' : 'false'
                                    )
                                  }
                                  className="data-[state=checked]:bg-neon"
                                />
                              ) : isNumberSetting(setting.key) ? (
                                <Input
                                  type="number"
                                  value={setting.currentValue}
                                  onChange={(e) =>
                                    updateSetting(setting.key, e.target.value)
                                  }
                                  className="w-24 h-8 text-sm text-right bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20"
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={setting.currentValue}
                                  onChange={(e) =>
                                    updateSetting(setting.key, e.target.value)
                                  }
                                  className="w-48 sm:w-64 h-8 text-sm bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20"
                                  placeholder={`Enter ${prettyKey(setting.key).toLowerCase()}`}
                                />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}

                {/* Save / Reset Buttons */}
                <Separator className="my-4 bg-border/50" />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {dirty > 0
                      ? `${dirty} unsaved change${dirty !== 1 ? 's' : ''}`
                      : 'All changes saved'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetCategory(cat.key)}
                      disabled={dirty === 0 || isSaving}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveCategory(cat.key)}
                      disabled={dirty === 0 || isSaving}
                      className="bg-neon hover:bg-neon/90 text-neon-foreground font-semibold gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: 'linear',
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </motion.div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
