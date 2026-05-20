'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Mail,
  MailOpen,
  MessageCircle,
  Archive,
  Inbox,
  Send,
  Clock,
  User,
  ChevronRight,
  X,
  Reply,
  ArchiveRestore,
  Eye,
} from 'lucide-react'

// ---- Types ----
interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'replied' | 'archived'
  reply: string
  createdAt: string
  updatedAt: string
}

// ---- Status config ----
const STATUS_CONFIG = {
  unread: {
    label: 'Unread',
    color: 'bg-red-500/15 text-red-500 border-red-500/30',
    icon: Mail,
    borderColor: 'border-l-red-500',
  },
  read: {
    label: 'Read',
    color: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    icon: MailOpen,
    borderColor: 'border-l-blue-500',
  },
  replied: {
    label: 'Replied',
    color: 'bg-green-500/15 text-green-500 border-green-500/30',
    icon: MessageCircle,
    borderColor: 'border-l-green-500',
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    icon: Archive,
    borderColor: 'border-l-gray-500',
  },
} as const

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'unread', label: 'Unread', icon: Mail },
  { key: 'read', label: 'Read', icon: MailOpen },
  { key: 'replied', label: 'Replied', icon: MessageCircle },
  { key: 'archived', label: 'Archived', icon: Archive },
] as const

// ---- Helpers ----
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 172800000) return 'Yesterday'
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

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// ---- Component ----
export function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Fetch messages
  const fetchMessages = useCallback(async (status?: string) => {
    try {
      const url =
        status && status !== 'all'
          ? `/api/admin/contacts?status=${status}`
          : '/api/admin/contacts'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error('Error fetching messages:', err)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchMessages(statusFilter)
  }, [statusFilter, fetchMessages])

  // Derived data
  const selectedMessage = messages.find((m) => m.id === selectedId) || null
  const unreadCount = messages.filter((m) => m.status === 'unread').length

  // Update message status
  const updateStatus = async (
    id: string,
    status: string,
    reply?: string
  ) => {
    setUpdatingStatus(id)
    try {
      const body: Record<string, unknown> = { id, status }
      if (reply !== undefined) body.reply = reply

      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to update message')

      const updated = await res.json()
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
      )
      toast.success(
        status === 'replied'
          ? 'Reply sent successfully'
          : `Message marked as ${status}`
      )
    } catch (err) {
      console.error('Error updating message:', err)
      toast.error('Failed to update message')
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Send reply
  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMessage.id,
          reply: replyText.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to send reply')

      const updated = await res.json()
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, ...updated } : m))
      )
      setReplyText('')
      toast.success('Reply sent successfully', {
        icon: <Send className="w-4 h-4 text-green-500" />,
      })
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  // Handle message selection
  const handleSelect = (msg: ContactMessage) => {
    setSelectedId(msg.id)
    setReplyText('')
    // Auto-mark as read when opened
    if (msg.status === 'unread') {
      updateStatus(msg.id, 'read')
    }
  }

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-80 rounded-xl" />
          </div>
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
            <Mail className="w-5 h-5 text-neon" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Contact Messages
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage incoming messages and replies
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-500/15 text-red-500 border-red-500/30 px-3 py-1">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon
            const count =
              tab.key === 'all'
                ? messages.length
                : messages.filter((m) => m.status === tab.key).length
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-neon/10 data-[state=active]:text-neon"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({count})
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Main Content: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Panel: Message List */}
        <div className="lg:col-span-2">
          <Card className="glass-card overflow-hidden">
            <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[560px]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No messages found
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Messages will appear here when users contact you
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {messages.map((msg, idx) => {
                      const statusCfg =
                        STATUS_CONFIG[msg.status as keyof typeof STATUS_CONFIG]
                      const isSelected = selectedId === msg.id

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          onClick={() => handleSelect(msg)}
                          className={`cursor-pointer transition-all duration-200 border-l-4 ${statusCfg.borderColor
                            } ${isSelected
                              ? 'bg-neon/5'
                              : msg.status === 'unread'
                                ? 'bg-background/80 hover:bg-neon/[0.03]'
                                : 'hover:bg-surface-light/50'
                            }`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSelect(msg)
                          }}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-sm font-semibold ${msg.status === 'unread'
                                        ? 'text-foreground'
                                        : 'text-foreground/80'
                                      }`}
                                  >
                                    {msg.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {msg.email}
                                </p>
                                {msg.subject && (
                                  <p className="text-xs font-medium text-foreground/90 truncate">
                                    {msg.subject}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                                  {msg.message}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatDate(msg.createdAt)}
                                </span>
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-colors ${isSelected
                                      ? 'text-neon'
                                      : 'text-muted-foreground/40'
                                    }`}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right Panel: Message Detail */}
        <div className="lg:col-span-3">
          <Card className="glass-card h-[400px] sm:h-[500px] lg:h-[560px] flex flex-col">
            {selectedMessage ? (
              <>
                {/* Detail Header */}
                <div className="p-4 sm:p-5 border-b border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {selectedMessage.subject || 'No Subject'}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[
                              selectedMessage.status as keyof typeof STATUS_CONFIG
                            ].color
                            }`}
                        >
                          {
                            STATUS_CONFIG[
                              selectedMessage.status as keyof typeof STATUS_CONFIG
                            ].label
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {selectedMessage.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedMessage.email}
                        </span>
                        <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(selectedMessage.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {selectedMessage.status === 'unread' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatus(selectedMessage.id, 'read')
                          }
                          disabled={updatingStatus === selectedMessage.id}
                          className="h-8 px-2 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                          title="Mark as read"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {selectedMessage.status !== 'archived' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatus(selectedMessage.id, 'archived')
                          }
                          disabled={updatingStatus === selectedMessage.id}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {selectedMessage.status === 'archived' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatus(selectedMessage.id, 'read')
                          }
                          disabled={updatingStatus === selectedMessage.id}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Unarchive"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedId(null)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <ScrollArea className="flex-1">
                  <div className="p-4 sm:p-5 space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="bg-background/50 border border-border/50 rounded-xl p-4">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {selectedMessage.message}
                        </p>
                      </div>
                    </motion.div>

                    {/* Previous Reply (if exists) */}
                    {selectedMessage.reply && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <Separator className="my-3 bg-border/50" />
                        <div className="flex items-center gap-2 mb-2">
                          <Reply className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs font-medium text-green-500">
                            Your Reply
                          </span>
                        </div>
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                            {selectedMessage.reply}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Reply Area */}
                <div className="p-4 border-t border-border/50">
                  <div className="space-y-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[80px] bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 resize-none text-sm"
                      disabled={selectedMessage.status === 'archived'}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground/60">
                        Reply will mark the message as &quot;Replied&quot;
                      </p>
                      <Button
                        size="sm"
                        onClick={sendReply}
                        disabled={
                          !replyText.trim() ||
                          sendingReply ||
                          selectedMessage.status === 'archived'
                        }
                        className="bg-neon hover:bg-neon/90 text-neon-foreground font-semibold gap-1.5"
                      >
                        {sendingReply ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: 'linear',
                              }}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </motion.div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground font-medium">
                  Select a message
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                  Choose a message from the list to view details and reply
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
