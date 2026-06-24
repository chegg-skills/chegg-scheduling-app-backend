import { useState, useEffect } from 'react'
import { Box, Stack, Typography, alpha, Button, CircularProgress, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import { Calendar, RefreshCw, XCircle, CheckCircle, Mail, UserCheck, UserX, Bell } from 'lucide-react'
import { useBookingTimeline } from '@/hooks/queries/useBookings'
import type { Booking } from '@/types'
import type { BookingActivity } from '@/api/bookings'

type ActivityType = BookingActivity['activityType']

// Lifecycle events that anchor the timeline as primary cards.
const PRIMARY_TYPES = new Set<ActivityType>([
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'COACH_REASSIGNED',
  'SESSION_COMPLETED',
  'SESSION_NO_SHOW',
  'SESSION_LOGGED',
  'ATTENDANCE_UPDATED',
  'FOLLOW_UP_BOOKED',
])

// BOOKING_CONFIRMED always fires immediately after BOOKING_CREATED with no extra signal.
const HIDDEN_ACTIVITY_TYPES = new Set<ActivityType>(['BOOKING_CONFIRMED'])

const ACTOR_LABEL: Record<BookingActivity['actorType'], string> = {
  STUDENT: 'Student',
  COACH: 'Coach',
  ADMIN: 'Admin',
  SYSTEM: 'System',
}

// A notification (EMAIL_SENT) is folded under the lifecycle action that triggered it.
// The correlation key is the notificationType recorded in metadata.
const resolveNotificationParent = (notificationType?: string): ActivityType | null => {
  if (!notificationType) return null
  const t = notificationType
  if (t.includes('RESCHEDULED')) return 'BOOKING_RESCHEDULED'
  if (t.includes('NO_SHOW')) return 'SESSION_NO_SHOW'
  if (t.includes('CANCEL')) return 'BOOKING_CANCELLED'
  if (t.includes('CONFIRMED') || t.includes('ASSIGNED')) return 'BOOKING_CREATED'
  if (t === 'STUDENT_SESSION_FEEDBACK') return 'SESSION_COMPLETED'
  return null
}

// Short, human label for a notification row shown as a secondary detail.
const notificationLabel = (activity: BookingActivity): string => {
  const t = (activity.metadata?.notificationType as string) || ''
  if (activity.activityType === 'REMINDER_SENT' || t.includes('REMINDER')) {
    const hours = t.match(/(\d+)H/)
    return hours ? `${hours[1]}h session reminder sent` : 'Session reminder sent'
  }
  if (t.includes('RESCHEDULED')) return 'Reschedule confirmation sent'
  if (t.includes('NO_SHOW')) return 'No-show notification sent'
  if (t.includes('CANCEL')) return 'Cancellation confirmation sent'
  if (t.includes('COCOACH_ASSIGNED')) return 'Co-coach notified'
  if (t.includes('ASSIGNED')) return 'Coach notified'
  if (t.includes('CONFIRMED')) return 'Confirmation email sent'
  if (t === 'STUDENT_SESSION_FEEDBACK') return 'Feedback request sent'
  return 'Notification sent'
}

type TimelineNode =
  | { kind: 'event'; activity: BookingActivity; notifications: BookingActivity[] }
  | { kind: 'reminder'; activity: BookingActivity }

// Restructure the flat activity log into primary lifecycle nodes with their
// notifications folded in, plus standalone reminder nodes (which have no
// triggering action). Pure function of the accumulated activity array, so it
// re-groups correctly as more pages load.
const buildTimeline = (items: BookingActivity[]): TimelineNode[] => {
  const primaries = items
    .filter((a) => PRIMARY_TYPES.has(a.activityType))
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))

  const notifications = items.filter(
    (a) => a.activityType === 'EMAIL_SENT' || a.activityType === 'REMINDER_SENT'
  )

  const attached: Record<string, BookingActivity[]> = {}
  const orphanReminders: BookingActivity[] = []

  for (const n of notifications) {
    const parentType =
      n.activityType === 'REMINDER_SENT'
        ? null
        : resolveNotificationParent(n.metadata?.notificationType as string)

    if (!parentType) {
      orphanReminders.push(n)
      continue
    }

    // Attach to the latest matching action at or before the email; a reschedule
    // and its email fire within the same request, so "nearest preceding" picks
    // the correct action even across repeated reschedules.
    const nTime = +new Date(n.timestamp)
    const candidates = primaries.filter((p) => p.activityType === parentType)
    const preceding = candidates.filter((p) => +new Date(p.timestamp) <= nTime)
    const target = preceding.length ? preceding[preceding.length - 1] : candidates[0]

    if (target) {
      ;(attached[target.id] ||= []).push(n)
    } else {
      orphanReminders.push(n)
    }
  }

  const nodes: TimelineNode[] = [
    ...primaries.map((p) => ({
      kind: 'event' as const,
      activity: p,
      notifications: attached[p.id] || [],
    })),
    ...orphanReminders.map((r) => ({ kind: 'reminder' as const, activity: r })),
  ]

  return nodes.sort(
    (a, b) => +new Date(b.activity.timestamp) - +new Date(a.activity.timestamp)
  )
}

interface BookingTimelineTabProps {
  booking: Booking
}

const getActivityStyles = (type: ActivityType, theme: any) => {
  switch (type) {
    case 'SESSION_COMPLETED':
    case 'SESSION_LOGGED':
      return {
        color: theme.palette.success.main,
        bgColor: alpha(theme.palette.success.main, 0.1),
        icon: CheckCircle,
      }
    case 'BOOKING_CREATED':
    case 'FOLLOW_UP_BOOKED':
      return {
        color: theme.palette.primary.main,
        bgColor: alpha(theme.palette.primary.main, 0.1),
        icon: Calendar,
      }
    case 'BOOKING_RESCHEDULED':
    case 'COACH_REASSIGNED':
      return {
        color: theme.palette.warning.main,
        bgColor: alpha(theme.palette.warning.main, 0.1),
        icon: RefreshCw,
      }
    case 'ATTENDANCE_UPDATED':
      return {
        color: theme.palette.info.main,
        bgColor: alpha(theme.palette.info.main, 0.1),
        icon: UserCheck,
      }
    case 'BOOKING_CANCELLED':
    case 'SESSION_NO_SHOW':
      return {
        color: theme.palette.error.main,
        bgColor: alpha(theme.palette.error.main, 0.1),
        icon: XCircle,
      }
    default:
      return {
        color: theme.palette.text.secondary,
        bgColor: alpha(theme.palette.text.secondary, 0.08),
        icon: Mail,
      }
  }
}

const getBaseTitle = (type: ActivityType): string => {
  switch (type) {
    case 'BOOKING_CREATED': return 'Booking Created'
    case 'BOOKING_RESCHEDULED': return 'Session Rescheduled'
    case 'BOOKING_CANCELLED': return 'Booking Cancelled'
    case 'SESSION_COMPLETED': return 'Session Completed'
    case 'SESSION_NO_SHOW': return 'Marked as No-Show'
    case 'SESSION_LOGGED': return 'Session Logged'
    case 'COACH_REASSIGNED': return 'Coach Reassigned'
    case 'ATTENDANCE_UPDATED': return 'Attendance Updated'
    case 'FOLLOW_UP_BOOKED': return 'Follow-up Booked'
    default: return 'Timeline Event'
  }
}

// Primary title carries the actor: "Session Rescheduled by Admin".
const getActivityTitle = (activity: BookingActivity): string => {
  const base = getBaseTitle(activity.activityType)
  if (activity.actorType === 'SYSTEM') return base
  return `${base} by ${ACTOR_LABEL[activity.actorType]}`
}

export function BookingTimelineTab({ booking }: BookingTimelineTabProps) {
  const theme = useTheme()
  const [page, setPage] = useState(1)
  const [activities, setActivities] = useState<BookingActivity[]>([])

  const limit = 10
  const { data, isLoading, isFetching } = useBookingTimeline(booking.id, { page, limit })

  // Reset local state when viewing a different booking
  useEffect(() => {
    setActivities([])
    setPage(1)
  }, [booking.id])

  // Accumulate loaded activities for lazy loading, dropping pure-noise entries
  useEffect(() => {
    if (data?.activities) {
      setActivities((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const newItems = data.activities.filter(
          (a) => !existingIds.has(a.id) && !HIDDEN_ACTIVITY_TYPES.has(a.activityType)
        )
        return [...prev, ...newItems]
      })
    }
  }, [data])

  const hasMore = data?.pagination ? page < data.pagination.totalPages : false

  const formatTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'p')
    } catch {
      return ''
    }
  }

  const formatDateTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'PPp')
    } catch {
      return ''
    }
  }

  const nodes = buildTimeline(activities)

  // Group nodes by date
  const groupNodesByDate = (items: TimelineNode[]) => {
    const groups: Record<string, TimelineNode[]> = {}
    items.forEach((node) => {
      try {
        const date = new Date(node.activity.timestamp)
        let dateStr = ''
        if (isToday(date)) {
          dateStr = 'Today'
        } else if (isYesterday(date)) {
          dateStr = 'Yesterday'
        } else {
          dateStr = format(date, 'EEEE, MMMM d, yyyy')
        }

        if (!groups[dateStr]) {
          groups[dateStr] = []
        }
        groups[dateStr].push(node)
      } catch (err) {
        console.error('Failed to group timeline date', err)
      }
    })
    return groups
  }

  const groupedNodes = groupNodesByDate(nodes)

  if (isLoading && page === 1) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        maxHeight: { xs: '380px', md: 'none' },
        overflowY: 'auto',
        pr: 1.5,
        mr: -1.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: '3px',
          '&:hover': {
            background: alpha(theme.palette.text.secondary, 0.4),
          },
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {nodes.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No timeline history recorded.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', pl: 0.5 }}>
            {/* Main Vertical Line */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                bottom: 8,
                left: 21,
                width: '2px',
                bgcolor: 'divider',
                borderRadius: 1,
              }}
            />

            <Stack spacing={3}>
              {Object.entries(groupedNodes).map(([dateGroup, items]) => (
                <Box key={dateGroup}>
                  {/* Date Header */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.72rem',
                      display: 'block',
                      mb: 2,
                      pl: 4,
                      position: 'relative',
                    }}
                  >
                    {dateGroup}
                  </Typography>

                  <Stack spacing={2.5}>
                    {items.map((node, index) => {
                      // Reminder nodes are de-emphasized secondary rows, not full cards.
                      if (node.kind === 'reminder') {
                        const activity = node.activity
                        return (
                          <Box
                            component={motion.div}
                            key={activity.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            sx={{ position: 'relative', pl: 5 }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 7,
                                top: 3,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                boxShadow: `inset 0 0 0 99px ${alpha(theme.palette.text.secondary, 0.08)}`,
                                border: `2px solid ${theme.palette.background.paper}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                                color: 'text.secondary',
                              }}
                            >
                              <Bell size={11} />
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: 1.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.78rem' }}
                              >
                                {notificationLabel(activity)}
                                {activity.metadata?.recipientRole &&
                                  activity.metadata.recipientRole !== 'UNKNOWN' && (
                                    <> &middot; {String(activity.metadata.recipientRole).toLowerCase()}</>
                                  )}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ whiteSpace: 'nowrap', fontSize: '0.72rem', opacity: 0.8 }}
                              >
                                {formatTime(activity.timestamp)}
                              </Typography>
                            </Box>
                          </Box>
                        )
                      }

                      const activity = node.activity
                      const style = getActivityStyles(activity.activityType, theme)
                      const Icon = style.icon

                      return (
                        <Box
                          component={motion.div}
                          key={activity.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          sx={{
                            position: 'relative',
                            pl: 5,
                          }}
                        >
                          {/* Bullet Point with Icon */}
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 5,
                              top: 2,
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              bgcolor: 'background.paper',
                              boxShadow: `inset 0 0 0 99px ${style.bgColor}`,
                              border: `2px solid ${theme.palette.background.paper}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                              color: style.color,
                            }}
                          >
                            <Icon size={13} />
                          </Box>

                          {/* Card Content */}
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: 1.5,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  color: 'text.primary',
                                }}
                              >
                                {getActivityTitle(activity)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                              >
                                {formatTime(activity.timestamp)}
                              </Typography>
                            </Box>

                            {activity.actorType !== 'SYSTEM' && activity.actorName && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', fontSize: '0.75rem', mt: 0.2 }}
                              >
                                {activity.actorName}
                              </Typography>
                            )}

                            {/* Metadata Renderers */}
                            {activity.activityType === 'BOOKING_CREATED' && activity.metadata?.startTime && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '0.75rem' }}>
                                Scheduled for {formatDateTime(activity.metadata.startTime)}
                              </Typography>
                            )}

                            {activity.activityType === 'BOOKING_RESCHEDULED' && activity.metadata?.previousSlot && (
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: alpha(theme.palette.action.hover, 0.6),
                                  border: `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  <strong>From:</strong> {formatDateTime(activity.metadata.previousSlot.startTime)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  <strong>To:</strong> {formatDateTime(activity.metadata.newSlot.startTime)}
                                </Typography>
                              </Box>
                            )}

                            {activity.activityType === 'BOOKING_CANCELLED' && activity.metadata?.cancellationReason && (
                              <Typography
                                variant="caption"
                                color="error.main"
                                sx={{
                                  display: 'block',
                                  mt: 0.8,
                                  fontStyle: 'italic',
                                  p: 0.8,
                                  borderRadius: 1,
                                  bgcolor: alpha(theme.palette.error.main, 0.05),
                                  borderLeft: `3px solid ${theme.palette.error.main}`,
                                }}
                              >
                                &ldquo;{activity.metadata.cancellationReason}&rdquo;
                              </Typography>
                            )}

                            {activity.activityType === 'ATTENDANCE_UPDATED' && (
                              <Box sx={{ mt: 0.6 }}>
                                <Chip
                                  size="small"
                                  icon={activity.metadata?.attended ? <UserCheck size={11} /> : <UserX size={11} />}
                                  label={activity.metadata?.attended ? 'Attended' : 'Did not attend'}
                                  color={activity.metadata?.attended ? 'success' : 'default'}
                                  sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 11 } }}
                                />
                              </Box>
                            )}

                            {activity.activityType === 'COACH_REASSIGNED' && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '0.75rem' }}>
                                The assigned coach was updated.
                              </Typography>
                            )}

                            {activity.activityType === 'FOLLOW_UP_BOOKED' && activity.metadata?.startTime && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '0.75rem' }}>
                                Scheduled for {formatDateTime(activity.metadata.startTime)}
                              </Typography>
                            )}

                            {/* Notifications triggered by this action — secondary detail */}
                            {node.notifications.length > 0 && (
                              <Stack spacing={0.3} sx={{ mt: 0.8 }}>
                                {node.notifications.map((n) => (
                                  <Box
                                    key={n.id}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}
                                  >
                                    <Mail size={11} color={theme.palette.text.disabled} />
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: '0.72rem', opacity: 0.85 }}
                                    >
                                      {notificationLabel(n)}
                                      {n.metadata?.recipientRole &&
                                        n.metadata.recipientRole !== 'UNKNOWN' && (
                                          <> &middot; {String(n.metadata.recipientRole).toLowerCase()}</>
                                        )}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Pagination Footer */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, pt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: 1,
            }}
          >
            {isFetching ? 'Loading...' : 'Load older events'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
