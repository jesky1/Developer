'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

import { AdminLogin } from '@/components/admin/admin-login'
import { AdminLayout } from '@/components/admin/admin-layout'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import AdminAnalytics from '@/components/admin/admin-analytics'
import AdminMatches from '@/components/admin/admin-matches'
import { AdminContent } from '@/components/admin/admin-content'
import { AdminAds } from '@/components/admin/admin-ads'
import { AdminAdSense } from '@/components/admin/admin-adsense'
import { AdminUsers } from '@/components/admin/admin-users'
import { AdminMessages } from '@/components/admin/admin-messages'
import { AdminAutoContent } from '@/components/admin/admin-auto-content'
import { AdminSettings } from '@/components/admin/admin-settings'
import { AdminAiChat } from '@/components/admin/admin-ai-chat'

const AUTH_KEY = 'goalzone_admin_token'

// Check if a stored token is valid (not expired)
// This component is loaded with ssr: false, so localStorage is available
function getInitialAuthState(): { authenticated: boolean; checking: boolean } {
  try {
    const token = localStorage.getItem(AUTH_KEY)
    if (!token) return { authenticated: false, checking: false }
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''))
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        return { authenticated: true, checking: false }
      }
      localStorage.removeItem(AUTH_KEY)
      return { authenticated: false, checking: false }
    } catch {
      // Token format invalid - still allow (backend validates)
      return { authenticated: true, checking: false }
    }
  } catch {
    return { authenticated: false, checking: false }
  }
}

interface AdminPanelProps {
  onBackToLive: () => void
}

export default function AdminPanel({ onBackToLive }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Initialize auth state from localStorage (safe because ssr: false)
  const [authState, setAuthState] = useState(getInitialAuthState)

  // Handle login
  const handleLogin = useCallback((token: string) => {
    try {
      localStorage.setItem(AUTH_KEY, token)
    } catch {
      // localStorage might not be available
    }
    setAuthState({ authenticated: true, checking: false })
  }, [])

  // Handle logout
  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch {
      // localStorage might not be available
    }
    setAuthState({ authenticated: false, checking: false })
    setActiveTab('dashboard')
  }, [])

  // Render active section content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />
      case 'analytics':
        return <AdminAnalytics />
      case 'matches':
        return <AdminMatches />
      case 'content':
        return <AdminContent onNavigateToAI={() => setActiveTab('auto-content')} />
      case 'ads':
        return <AdminAds />
      case 'adsense':
        return <AdminAdSense />
      case 'users':
        return <AdminUsers />
      case 'messages':
        return <AdminMessages />
      case 'auto-content':
        return <AdminAutoContent />
      case 'settings':
        return <AdminSettings />
      default:
        return <AdminDashboard />
    }
  }

  // Checking auth state
  if (authState.checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-neon animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Admin Panel...</span>
        </div>
      </div>
    )
  }

  // Not authenticated - show login
  if (!authState.authenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  // Authenticated - show admin panel
  return (
    <div className="h-screen flex flex-col bg-background">
      <AdminLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onBackToLive={onBackToLive}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </AdminLayout>

      {/* AI Chat Assistant - floating */}
      <AdminAiChat />
    </div>
  )
}
