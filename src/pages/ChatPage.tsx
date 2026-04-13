/**
 * ChatPage — Conversational psychoeducation.
 *
 * Clinical Sanctuary design: warm, editorial, calming.
 * Supports both screening-linked and standalone conversations.
 * Standalone chat has a sidebar with past conversations (ChatGPT-style).
 *
 * The user may be in a fragile state. Every interaction must feel safe.
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Bot, Plus, MessageCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { chat as chatApi, screening as screeningApi } from '../api/client'
import type { ChatMessage, ScreeningResponse, ConversationResponse } from '../types/api'
import { useAuth } from '../contexts/AuthContext'
import { BreathingCircle, BreathingDot } from '../components/ui/BreathingCircle'
import { PageTransition } from '../components/ui/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { formatRelative } from '../lib/localization'

export function ChatPage() {
  const { screeningId } = useParams<{ screeningId: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [screening, setScreening] = useState<ScreeningResponse | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<ConversationResponse[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Determine if this is a screening-linked or standalone chat
  const isScreeningChat = !!screeningId && screeningId !== 'conversations'

  // Load past conversations (only for standalone mode)
  useEffect(() => {
    if (isScreeningChat) return
    chatApi.getConversations().then(setConversations).catch(() => {})
  }, [isScreeningChat])

  // Load screening + its chat history if screening-linked
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

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId)
    setMessages([])
    try {
      const history = await chatApi.getConversationMessages(convId)
      setMessages(history.messages)
    } catch {
      toast.error('Could not load that conversation.')
    }
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await chatApi.archiveConversation(convId)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (activeConversationId === convId) {
        handleNewConversation()
      }
      toast.success('Conversation removed.')
    } catch {
      toast.error('Could not remove that conversation.')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const streamingId = `streaming-${Date.now()}`
    const userMsgId = `user-${Date.now()}`

    setMessages(prev => [
      ...prev,
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
        // Use existing conversation if selected, otherwise create a new one
        let convId = activeConversationId
        if (!convId) {
          const conv = await chatApi.createConversation({ title: text.slice(0, 50), context_type: 'general' })
          convId = conv.id
          setActiveConversationId(convId)
          // Refresh conversations list so the new one appears in the sidebar
          chatApi.getConversations().then(setConversations).catch(() => {})
        }
        await chatApi.streamConversationMessage(convId, text, appendChunk)
      }
    } catch (err: unknown) {
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

  // ── Screening-linked chat: no sidebar (single-purpose view) ──
  if (isScreeningChat) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Link to={`/results/${screeningId}`} className="btn-ghost text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Results
            </Link>

            {screening && (
              <div className="text-xs text-muted-foreground">
                Screening: {screening.symptom_analysis.severity_level} severity · {screening.symptom_analysis.unique_symptom_count} symptoms
              </div>
            )}
          </div>

          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            sending={sending}
            user={user}
            suggestions={suggestions}
            isScreeningChat={true}
            inputRef={inputRef}
            bottomRef={bottomRef}
          />
        </div>
      </PageTransition>
    )
  }

  // ── Standalone chat with ChatGPT-style sidebar ──
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto flex gap-4" style={{ height: 'calc(100vh - 10rem)' }}>
        {/* Sidebar */}
        <aside className="w-64 shrink-0 card-warm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <button
              onClick={handleNewConversation}
              className="w-full btn-primary text-xs h-9 justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {conversations.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                Your past conversations will appear here.
              </div>
            ) : (
              <ul className="py-2">
                {conversations.map(conv => (
                  <li key={conv.id}>
                    <button
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-start gap-2 group transition-colors ${
                        activeConversationId === conv.id
                          ? 'bg-primary/8 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{conv.title || 'Untitled'}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">
                          {formatRelative(conv.updated_at)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity shrink-0"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main chat */}
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleKeyDown={handleKeyDown}
          sending={sending}
          user={user}
          suggestions={suggestions}
          isScreeningChat={false}
          inputRef={inputRef}
          bottomRef={bottomRef}
        />
      </div>
    </PageTransition>
  )
}

// ── Chat panel (messages + input) ──
interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  setInput: (v: string) => void
  handleSend: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  sending: boolean
  user: ReturnType<typeof useAuth>['user']
  suggestions: string[]
  isScreeningChat: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  bottomRef: React.RefObject<HTMLDivElement>
}

function ChatPanel(props: ChatPanelProps) {
  const { messages, input, setInput, handleSend, handleKeyDown, sending, user, suggestions, isScreeningChat, inputRef, bottomRef } = props

  return (
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
            title={isScreeningChat ? 'Ask about your results' : 'Chat about anything'}
            description={
              isScreeningChat
                ? 'This is a safe space to explore your screening results. Ask anything — there are no wrong questions.'
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
          {messages.map(msg => (
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

              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed font-body ${
                  msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-muted/60 text-foreground rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' && msg.content === '' ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <BreathingDot />
                    <BreathingDot className="[animation-delay:0.5s]" />
                    <BreathingDot className="[animation-delay:1s]" />
                  </div>
                ) : (
                  msg.content.split('\n').map((line, j) => (
                    <p key={j} className={j > 0 ? 'mt-2' : ''}>
                      {line}
                    </p>
                  ))
                )}
              </div>

              {msg.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-lg bg-clay/10 flex items-center justify-center shrink-0 mt-0.5"
                  title={user?.full_name || 'You'}
                >
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

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
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
          <button type="submit" disabled={!input.trim() || sending} className="btn-primary px-3 h-[44px]" aria-label="Send message">
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          If you're in crisis, call <strong>999</strong> (Bahrain) or Shamsaha <strong>17651421</strong> (24/7)
        </p>
      </div>
    </div>
  )
}
