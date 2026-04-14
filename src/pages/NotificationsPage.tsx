/**
 * NotificationsPage — Patient notification inbox.
 *
 * Shows screening reminders, clinician messages, appointment reminders,
 * and system alerts. Warm empty state when caught up.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, ClipboardList, Calendar, MessageCircle, AlertTriangle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { patient as patientApi } from '../api/client'
import type { NotificationResponse } from '../types/api'
import { formatRelative } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle, BreathingDot } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  screening_due: ClipboardList,
  screening_missed: Clock,
  screening_overdue: Clock,
  new_message: MessageCircle,
  appointment_reminder: Calendar,
  appointment_scheduled: Calendar,
  care_plan_updated: ClipboardList,
  care_plan_review: ClipboardList,
  crisis_alert: AlertTriangle,
  document_uploaded: ClipboardList,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  screening_due: 'bg-sky-50 text-sky-600',
  screening_missed: 'bg-slate-50 text-slate-600',
  screening_overdue: 'bg-slate-50 text-slate-600',
  new_message: 'bg-primary/10 text-primary',
  appointment_reminder: 'bg-purple-50 text-purple-600',
  appointment_scheduled: 'bg-purple-50 text-purple-600',
  care_plan_updated: 'bg-emerald-50 text-emerald-600',
  care_plan_review: 'bg-amber-50 text-amber-700',
  crisis_alert: 'bg-red-50 text-red-600',
  document_uploaded: 'bg-slate-50 text-slate-600',
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    Promise.all([
      patientApi.getNotifications(showAll).then(setNotifications),
      patientApi.getUnreadCount().then(r => setUnreadCount(r.unread_count)),
    ])
      .catch(() => toast.error('Could not load notifications.'))
      .finally(() => setLoading(false))
  }, [showAll])

  const handleMarkRead = async (id: string) => {
    try {
      await patientApi.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error('Could not update notification.')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await patientApi.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read.')
    } catch {
      toast.error('Could not update notifications.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Loading notifications..." />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground font-body mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setShowAll(false)}
                className={`px-3 py-1.5 text-xs font-body rounded-md transition-all duration-200 ${
                  !showAll ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setShowAll(true)}
                className={`px-3 py-1.5 text-xs font-body rounded-md transition-all duration-200 ${
                  showAll ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                All
              </button>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn-ghost text-xs"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <EmptyState
            showBreathingDot
            title="All caught up"
            description="No new notifications. Take a moment to breathe."
          />
        ) : (
          <StaggerChildren className="space-y-2">
            {notifications.map(n => {
              const IconComponent = NOTIFICATION_ICONS[n.notification_type] || Bell
              const colorClass = NOTIFICATION_COLORS[n.notification_type] || 'bg-muted text-muted-foreground'

              return (
                <StaggerItem key={n.id}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`card-warm p-4 flex items-start gap-3.5 transition-all duration-300 ${
                      !n.is_read ? 'border-l-2 border-l-primary' : 'opacity-70'
                    }`}
                  >
                    {/* Icon + unread dot */}
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      {!n.is_read && (
                        <div className="absolute -top-0.5 -right-0.5">
                          <BreathingDot className="w-2 h-2" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-body ${!n.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 font-body shrink-0 mt-0.5">
                          {formatRelative(n.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-2">
                        {n.link && (
                          <Link to={n.link} className="text-xs text-primary font-body hover:underline">
                            View details
                          </Link>
                        )}
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              )
            })}
          </StaggerChildren>
        )}
      </div>
    </PageTransition>
  )
}
