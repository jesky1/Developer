'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  BarChart3,
  Swords,
  FileText,
  MousePointerClick,
  DollarSign,
  Users as UsersIcon,
  Mail,
  Zap,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

// --- Navigation config ---
interface NavItem {
  id: string
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'ads', label: 'Ad Tracking', icon: MousePointerClick },
  { id: 'adsense', label: 'AdSense', icon: DollarSign },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'auto-content', label: 'AI Generator', icon: Zap },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

// --- Props ---
interface AdminLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onBackToLive: () => void
  children: React.ReactNode
}

// --- Sidebar content (shared between desktop & mobile) ---
function SidebarContent({
  collapsed,
  activeTab,
  onTabChange,
  onLogout,
  onNavigate,
}: {
  collapsed: boolean
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border px-4 py-5 transition-all',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon font-bold text-neon-foreground shadow-md shadow-neon/20">
          GZ
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-bold tracking-wide text-foreground">
                GOALZONE
              </span>
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                Admin
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation items */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon

            const button = (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  onNavigate?.()
                }}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-neon/10 text-neon shadow-sm'
                    : 'text-muted-foreground',
                  collapsed && 'justify-center px-2'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-indicator"
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-neon"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive ? 'text-neon' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )

            // Show tooltip when sidebar is collapsed
            if (collapsed) {
              return (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <Separator />
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/10 text-xs font-bold text-neon">
          A
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden flex items-center justify-between flex-1"
            >
              <div className="whitespace-nowrap">
                <p className="text-sm font-medium text-foreground whitespace-nowrap">Admin User</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Super Admin</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={onLogout}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Sign Out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// --- Main Layout Component ---
export function AdminLayout({ activeTab, onTabChange, onLogout, onBackToLive, children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab)
  const pageTitle = activeItem?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== Desktop Sidebar ===== */}
      <aside
        className={cn(
          'relative hidden border-r border-border bg-card transition-all duration-300 md:flex md:flex-col md:shrink-0',
          collapsed ? 'w-16' : 'w-[260px]'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* ===== Mobile Sidebar (Sheet) ===== */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] border-r border-border bg-card p-0"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Admin panel navigation menu
          </SheetDescription>
          <SidebarContent
            collapsed={false}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onLogout={onLogout}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ===== Main Content Area ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur-sm md:px-6">
          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page title */}
          <div className="flex items-center gap-2">
            {activeItem && (
              <activeItem.icon className="h-4 w-4 text-neon" />
            )}
            <h1 className="text-base font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon" />
              Live
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLive}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ← <span className="hidden sm:inline">Live Scores</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
