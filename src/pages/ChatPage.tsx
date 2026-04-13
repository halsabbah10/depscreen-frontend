/**
 * ChatPage — Conversational psychoeducation.
 *
 * Clinical Sanctuary design: warm, editorial, calming.
 * Supports both screening-linked and standalone conversations.
 * Chat is always accessible — not tied to a specific screening.
 *
 * The user may be in a fragile state. Every interaction must feel safe.
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import { chat as chatApi, screening as screeningApi } from '../api/client'
import type { ChatMessage, ScreeningResponse } from '../types/api'
import { useAuth } from '../contexts/AuthContext'
import { BreathingCircle, BreathingDot } from '../components/ui/BreathingCircle'
import { PageTransition } from '../components/ui/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'

export function ChatPage() {
  const { screeningId } = useParams<{ screeningId: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [screening, setScreening] = useState<ScreeningResponse | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Determine if this is a screening-linked or standalone chat
  const isScreeningChat = !!screeningId && screeningId !== 'conversations'

  useEffect(() => {
    if (!isScreeningChat) {
      setLoading(false)
      return
    }
    Promise.all([
      chatApi.getScreeningChatHistory(screeningId!).then(r => setMessages(r.messages)).catch(() => {}),
      screeningApi.getById(screeningId!).then(setScreening).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [screeningId, isScreeningChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    // Optimistic user message
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, role: 'user', content: text, created_at: new Date().toISOString(),
    }])

    // Add a placeholder assistant message that we'll fill in as chunks arrive
    const streamingId = `streaming-${Date.now()}`
    const userMsgId = `user-${Date.now()}`

    setMessages(prev => [
      ...prev.filter(m => m.id !== tempId),
      { id: userMsgId, role: 'user', content: text, created_at: new Date().toISOString() },
      { id: streamingId, role: 'assistant', content: '', created_at: new Date().toISOString() },
    ])

    try {
      const appendChunk = (chunk: string) => {
        setMessages(prev =>
          prev.map(m => (m.id === streamingId ? { ...m, content: m.content + chunk } : m))
        )
      }

      if (isScreeningChat) {
        await chatApi.streamScreeningMessage(screeningId!, text, appendChunk)
      } else {
        // For standalone, create a conversation if none exists
        const conv = await chatApi.createConversation({ title: text.slice(0, 50), context_type: 'general' })
        await chatApi.streamConversationMessage(conv.id, text, appendChunk)
      }
    } catch (err: unknown) {
      // Remove the streaming placeholder on error
      setMessages(prev => prev.filter(m => m.id !== streamingId && m.id !== userMsgId))
      setInput(text)
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Unable to send message. Please try again.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Preparing your space..." />
      </div>
    )
  }

  const suggestions = [
    'What does my severity level mean?',
    'What are some coping strategies for me?',
    'Should I see a professional?',
  ]

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to={isScreeningChat ? `/results/${screeningId}` : '/history'}
            className="btn-ghost text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {isScreeningChat ? 'Back to Results' : 'Back'}
          </Link>

          {screening && (
            <div className="text-xs text-muted-foreground">
              Screening: {screening.symptom_analysis.severity_level} severity · {screening.symptom_analysis.unique_symptom_count} symptoms
            </div>
          )}
        </div>

        {/* Chat container */}
        <div className="flex-1 flex flex-col card-warm overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-display text-foreground">DepScreen Assistant</span>
              <p className="text-[10px] text-muted-foreground">
                A supportive voice — not a replacement for professional care
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">
            {messages.length === 0 && (
              <EmptyState
                title={isScreeningChat ? "Ask about your results" : "Chat about anything"}
                description={isScreeningChat
                  ? "This is a safe space to explore your screening results. Ask anything — there are no wrong questions."
                  : "You're safe here. Share how you're feeling, or ask about mental health topics."
                }
                showBreathingDot
                className="py-8"
              />
            )}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs px-3.5 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/3 transition-all duration-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}

                  <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed font-body ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-muted/60 text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                    ))}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-clay/10 flex items-center justify-center shrink-0 mt-0.5" title={user?.full_name || 'You'}>
                      {user?.profile_picture_url ? (
                        <img src={user.profile_picture_url} alt="" className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-clay font-body">
                          {user?.full_name?.charAt(0)?.toUpperCase() || 'Y'}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted/60 px-4 py-3 rounded-xl rounded-bl-sm flex items-center gap-2">
                  <BreathingDot />
                  <BreathingDot className="[animation-delay:0.5s]" />
                  <BreathingDot className="[animation-delay:1s]" />
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={e => { e.preventDefault(); handleSend() }}
              className="flex gap-2 items-end"
            >
              <textarea
                ref={inputRef}
                className="input flex-1 resize-none min-h-[44px] max-h-[120px]"
                placeholder="Share what's on your mind..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                rows={1}
                aria-label="Message input"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="btn-primary px-3 h-[44px]"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Crisis resource — always visible in chat */}
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              If you're in crisis, call <strong>999</strong> (Bahrain) or Shamsaha <strong>17651421</strong> (24/7)
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
