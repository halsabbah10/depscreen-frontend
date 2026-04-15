/**
 * ChatPage — Conversational psychoeducation (ChatGPT-style).
 *
 * URL routes:
 *   /chat                       → new conversation
 *   /chat/c/:conversationId     → specific past conversation
 *   /chat/screening/:screeningId → screening-linked (no sidebar)
 *
 * Features:
 * - Date-grouped sidebar (Today / Yesterday / This Week / Older)
 * - Markdown rendering for assistant messages
 * - Copy-to-clipboard per message
 * - Inline rename + delete per conversation
 * - Auto-generated titles from first exchange (via LLM)
 * - Streaming responses
 *
 * The user may be in a fragile state. Every interaction must feel safe.
 */

import { useEffect, useState, useRef, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Bot, Plus, MessageCircle, Trash2, Copy, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chat as chatApi, screening as screeningApi } from '../api/client'
import type { ChatMessage, ScreeningResponse, ConversationResponse } from '../types/api'
import { useAuth } from '../contexts/AuthContext'
import { BreathingCircle, BreathingDot } from '../components/ui/BreathingCircle'
import { PageTransition } from '../components/ui/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { formatRelative } from '../lib/localization'

export function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Parse path manually so the component stays mounted when switching between
  // /chat, /chat/c/:id, /chat/screening/:id (one Route handles all via /chat/*).
  const conversationId = useMemo(() => {
    const m = location.pathname.match(/^\/chat\/c\/([^/]+)/)
    return m ? m[1] : undefined
  }, [location.pathname])
  const screeningId = useMemo(() => {
    const m = location.pathname.match(/^\/chat\/screening\/([^/]+)/)
    return m ? m[1] : undefined
  }, [location.pathname])
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [screening, setScreening] = useState<ScreeningResponse | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<ConversationResponse[]>([])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Track conversation IDs we've just created locally so the reload-messages
  // effect can skip fetching for them (we already have the messages in state).
  const locallyCreatedConvIds = useRef<Set<string>>(new Set())

  const isScreeningChat = !!screeningId

  // Load past conversations (only for standalone mode)
  useEffect(() => {
    if (isScreeningChat) return
    chatApi.getConversations().then(setConversations).catch(() => {})
  }, [isScreeningChat])

  // Load screening + its chat history if screening-linked
  useEffect(() => {
    if (!isScreeningChat) return
    setLoading(true)
    Promise.all([
      chatApi.getScreeningChatHistory(screeningId!).then(r => setMessages(r.messages)).catch(() => {}),
      screeningApi.getById(screeningId!).then(setScreening).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [screeningId, isScreeningChat])

  // Load specific conversation if URL has conversationId
  useEffect(() => {
    if (isScreeningChat) return
    if (conversationId) {
      // Skip reload if we just created this conversation locally — we already
      // have the messages in state from the streaming session.
      if (locallyCreatedConvIds.current.has(conversationId)) {
        setLoading(false)
        return
      }
      setLoading(true)
      chatApi.getConversationMessages(conversationId)
        .then(r => setMessages(r.messages))
        .catch(() => {
          toast.error('That conversation could not be loaded.')
          navigate('/chat', { replace: true })
        })
        .finally(() => setLoading(false))
    } else {
      setMessages([])
      setLoading(false)
    }
  }, [conversationId, isScreeningChat, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewConversation = () => {
    navigate('/chat')
    setInput('')
    inputRef.current?.focus()
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    try {
      await chatApi.archiveConversation(convId)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (conversationId === convId) {
        navigate('/chat', { replace: true })
      }
      toast.success('Conversation deleted.')
    } catch {
      toast.error('Could not delete conversation.')
    }
  }

  const handleStartRename = (conv: ConversationResponse, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingId(conv.id)
    setRenameValue(conv.title || '')
  }

  const handleCommitRename = async (convId: string) => {
    const newTitle = renameValue.trim()
    setRenamingId(null)
    if (!newTitle) return
    try {
      await chatApi.renameConversation(convId, newTitle)
      setConversations(prev => prev.map(c => (c.id === convId ? { ...c, title: newTitle } : c)))
    } catch {
      toast.error('Could not rename conversation.')
    }
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('Copied to clipboard', { duration: 1500 })
    } catch {
      toast.error('Copy failed.')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const streamingId = `streaming-${Date.now()}`
    const userMsgId = `user-${Date.now()}`
    const isFirstMessage = messages.length === 0

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
        let convId = conversationId
        if (!convId) {
          const conv = await chatApi.createConversation({ title: text.slice(0, 50), context_type: 'general' })
          convId = conv.id
          // Mark as locally created so the URL-change useEffect doesn't reload
          // (and blank the streaming messages we're about to populate).
          locallyCreatedConvIds.current.add(convId)
          navigate(`/chat/c/${convId}`, { replace: true })
        }
        await chatApi.streamConversationMessage(convId, text, appendChunk)

        // Auto-generate a better title after the first exchange
        if (isFirstMessage && convId) {
          chatApi.autoTitleConversation(convId)
            .then(({ title }) => {
              setConversations(prev =>
                prev.map(c => (c.id === convId ? { ...c, title } : c))
              )
            })
            .catch(() => {})
        }

        // Refresh sidebar list
        chatApi.getConversations().then(setConversations).catch(() => {})
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

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const groups: Record<string, ConversationResponse[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Older: [],
    }
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7)

    for (const c of conversations) {
      // Backend returns naive UTC — append Z if missing
      const raw = c.updated_at || c.created_at
      const parsed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? new Date(raw) : new Date(raw + 'Z')
      if (parsed >= today) groups.Today.push(c)
      else if (parsed >= yesterday) groups.Yesterday.push(c)
      else if (parsed >= weekStart) groups['This week'].push(c)
      else groups.Older.push(c)
    }
    return groups
  }, [conversations])

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

  // ── Screening-linked chat: no sidebar ──
  if (isScreeningChat) {
    return (
      <PageTransition className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 min-h-0">
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
            onCopyMessage={handleCopyMessage}
          />
        </div>
      </PageTransition>
    )
  }

  // ── Standalone chat with sidebar ──
  return (
    <PageTransition className="flex-1 flex flex-col min-h-0">
      <div className="max-w-6xl w-full mx-auto flex gap-4 flex-1 min-h-0">
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
              <div className="py-2">
                {(['Today', 'Yesterday', 'This week', 'Older'] as const).map(groupName => {
                  const group = groupedConversations[groupName]
                  if (!group || group.length === 0) return null
                  return (
                    <div key={groupName} className="mb-3">
                      <div className="px-4 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {groupName}
                      </div>
                      <ul>
                        {group.map(conv => {
                          const isActive = conv.id === conversationId
                          const isRenaming = renamingId === conv.id
                          return (
                            <li key={conv.id}>
                              <div
                                onClick={() => !isRenaming && navigate(`/chat/c/${conv.id}`)}
                                role="button"
                                tabIndex={0}
                                className={`w-full text-left px-4 py-2.5 text-xs flex items-start gap-2 group transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                                }`}
                              >
                                <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
                                <div className="flex-1 min-w-0">
                                  {isRenaming ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      className="w-full bg-transparent border-b border-primary/50 outline-none text-xs py-0.5"
                                      value={renameValue}
                                      onChange={e => setRenameValue(e.target.value)}
                                      onBlur={() => handleCommitRename(conv.id)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleCommitRename(conv.id)
                                        if (e.key === 'Escape') setRenamingId(null)
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  ) : (
                                    <>
                                      <div className="truncate font-medium">{conv.title || 'Untitled'}</div>
                                      <div className="text-[10px] opacity-60 mt-0.5">
                                        {formatRelative(conv.updated_at)}
                                      </div>
                                    </>
                                  )}
                                </div>
                                {!isRenaming && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={(e) => handleStartRename(conv, e)}
                                      className="hover:text-primary"
                                      aria-label="Rename"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                                      className="hover:text-danger"
                                      aria-label="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
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
          onCopyMessage={handleCopyMessage}
        />
      </div>
    </PageTransition>
  )
}

// ── Chat panel ──
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
  onCopyMessage: (content: string) => void
}

function ChatPanel(props: ChatPanelProps) {
  const { messages, input, setInput, handleSend, handleKeyDown, sending, user, suggestions, isScreeningChat, inputRef, bottomRef, onCopyMessage } = props

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
                className="text-xs px-3.5 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
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
              className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              <div className="flex flex-col max-w-[80%]">
                <div
                  className={`px-4 py-3 rounded-xl text-sm leading-relaxed font-body ${
                    msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-muted/60 text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content === '' ? (
                    <div className="flex items-center gap-2 py-0.5">
                      <BreathingDot />
                      <BreathingDot className="[animation-delay:0.5s]" />
                      <BreathingDot className="[animation-delay:1s]" />
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>
                        {line}
                      </p>
                    ))
                  )}
                </div>

                {/* Copy button — only on assistant messages with content */}
                {msg.role === 'assistant' && msg.content && !msg.id.startsWith('streaming-') && (
                  <button
                    onClick={() => onCopyMessage(msg.content)}
                    className="self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    aria-label="Copy message"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
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
