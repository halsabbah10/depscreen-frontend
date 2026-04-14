/**
 * MessagesPage — Patient-side direct message thread with their clinician.
 *
 * Simple chat-style interface showing the full conversation history, with a
 * compose box at the bottom. Does not involve the AI assistant.
 */

import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { patient as patientApi } from '../api/client'
import type { DirectMessageThread, DirectMessageResponse } from '../types/api'
import { formatRelative } from '../lib/localization'
import { PageTransition } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

export function MessagesPage() {
  const [thread, setThread] = useState<DirectMessageThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    patientApi.getClinicianMessages()
      .then(t => setThread(t))
      .catch(() => toast.error('Could not load messages.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Auto-scroll to latest message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thread?.messages.length])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const newMsg = await patientApi.sendMessageToClinician(content)
      setThread(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev)
      setInput('')
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Loading messages..." />
      </div>
    )
  }

  if (!thread) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<MessageCircle className="w-10 h-10 text-muted-foreground" />}
            title="No clinician assigned yet"
            description="Once a clinician is linked to your account, you'll be able to message them directly from here."
          />
        </div>
      </PageTransition>
    )
  }

  const { messages, clinician_name } = thread

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <h1 className="font-display text-2xl text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
            Messages with {clinician_name || 'your clinician'}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Private, thoughtful. No AI — only a real person on the other end.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="card-warm p-4 h-[60vh] overflow-y-auto mb-3 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground font-body italic text-center max-w-xs">
                No messages yet. Say anything — a question, an update, or just that you'd like to check in.
              </p>
            </div>
          ) : (
            messages.map(m => <MessageBubble key={m.id} message={m} isOwn={m.role === 'user'} />)
          )}
        </div>

        <div className="card-warm p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Write a message..."
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-body focus:outline-none"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function MessageBubble({ message, isOwn }: { message: DirectMessageResponse; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
        isOwn
          ? 'bg-primary/10 text-foreground'
          : 'bg-muted text-foreground'
      }`}>
        {!isOwn && message.sender_name && (
          <p className="text-[10px] font-body text-muted-foreground mb-0.5 uppercase tracking-wider">
            {message.sender_name}
          </p>
        )}
        <p className="text-sm font-body whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p className="text-[10px] text-muted-foreground/70 font-body mt-1">{formatRelative(message.created_at)}</p>
      </div>
    </div>
  )
}
