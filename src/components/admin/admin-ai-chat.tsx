'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Bot, Send, X, MessageSquare, Sparkles } from 'lucide-react'

// ---- Types ----
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ---- Suggested Prompts ----
const SUGGESTED_PROMPTS = [
  'Generate match summary',
  'Suggest article topics',
  "Analyze today's traffic",
  'Write a breaking news headline',
]

// ---- Helpers ----
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Sub-Components ----

/** Typing indicator - three bouncing dots */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-neon" />
      </div>
      <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-neon/60"
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Suggested prompt button */
function SuggestedPrompt({
  text,
  onClick,
}: {
  text: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left text-xs px-3 py-2 rounded-lg border border-neon/20 bg-neon/5 text-neon/80 hover:bg-neon/10 hover:text-neon hover:border-neon/40 transition-all duration-200 cursor-pointer"
    >
      <Sparkles className="w-3 h-3 inline-block mr-1 opacity-60" />
      {text}
    </button>
  )
}

/** Single chat message bubble */
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-end gap-2 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary/20 border border-primary/30'
            : 'bg-neon/10 border border-neon/20'
        }`}
      >
        {isUser ? (
          <span className="text-[10px] font-bold text-primary">You</span>
        ) : (
          <Bot className="w-3.5 h-3.5 text-neon" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-neon text-neon-foreground rounded-br-sm font-medium'
            : 'glass-card rounded-bl-sm'
        }`}
      >
        <p
          className={`text-sm whitespace-pre-wrap leading-relaxed ${
            isUser ? 'text-neon-foreground' : 'text-foreground/90'
          }`}
        >
          {message.content}
        </p>
        <p
          className={`text-[10px] mt-1.5 ${
            isUser ? 'text-neon-foreground/50' : 'text-muted-foreground/40'
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  )
}

// ---- Main Component ----
export function AdminAiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Send message to AI
  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isTyping) return

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: 'Admin panel chat',
        }),
      })

      if (!res.ok) throw new Error('Failed to get AI response')

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          'I apologize, something went wrong. Please try again in a moment.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-neon text-neon-foreground shadow-lg shadow-neon/25 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-150"
            aria-label="Open AI Assistant"
          >
            <MessageSquare className="w-6 h-6" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-neon/30 animate-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[340px] sm:w-[380px] h-[480px] sm:h-[500px]"
          >
            <Card className="glass-card neon-glow flex flex-col h-full overflow-hidden rounded-2xl border-neon/20 shadow-2xl shadow-neon/10">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-neon/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neon/15 border border-neon/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-neon" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      GOALZONE AI
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Admin Assistant
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
                {/* Welcome message if empty */}
                {messages.length === 0 && !isTyping && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
                    <div className="w-14 h-14 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center mb-2">
                      <Sparkles className="w-7 h-7 text-neon" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        How can I help?
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        I can help with match summaries, article ideas, traffic
                        analysis, and more.
                      </p>
                    </div>

                    {/* Suggested Prompts */}
                    <div className="grid grid-cols-1 gap-2 w-full mt-2">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <SuggestedPrompt
                          key={prompt}
                          text={prompt}
                          onClick={() => sendMessage(prompt)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border/50 bg-background/30">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={isTyping}
                    className="flex-1 h-9 text-sm bg-background/60 border-border focus:border-neon/50 focus:ring-neon/20 placeholder:text-muted-foreground/40"
                  />
                  <Button
                    size="sm"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isTyping}
                    className="h-9 w-9 p-0 bg-neon hover:bg-neon/90 text-neon-foreground flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground/30 mt-1.5 text-center">
                  AI responses may not always be accurate
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
