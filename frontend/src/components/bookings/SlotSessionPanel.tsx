import React, { useState } from 'react'
import { Box, Stack, Typography, alpha, Divider, Avatar, Tooltip, IconButton, Collapse, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { Users, XCircle, Calendar, CalendarPlus, Clock, Mail } from 'lucide-react'
import type { Booking } from '@/types'
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate'
import { useAuth } from '@/context/auth/useAuth'
import { toTitleCase } from '@/utils/toTitleCase'
import { BookingStatusBadge } from './BookingStatusBadge'
import { CancelBookingDialog } from './CancelBookingDialog'
import { BookFollowUpDialog } from './BookFollowUpDialog'
import { SendEmailDialog } from '@/components/students/dialogs/SendEmailDialog'
import { useTimezones } from '@/hooks/queries/useConfig'
import { formatTimezoneLabel } from '@/components/users/userSystemFieldUtils'
import { usePermissions } from '@/hooks/usePermissions'
import { BookingSection } from './sections/Common'

// Sections for left column
import { EventTeamSection } from './sections/EventTeamSection'
import { LocationSection } from './sections/LocationSection'
import { ScheduleSection } from './sections/ScheduleSection'
import { CoachSection } from './sections/CoachSection'

// Sections for right column
import { BookingDetailsRightSection } from './BookingDetailsRightSection'

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

interface SlotSessionPanelProps {
  bookings: Booking[]
}

interface GroupParticipantsListProps {
  bookings: Booking[]
  selectedId: string | null
  onSelect: (id: string) => void
  capacity: number | null
}

function StudentLocalTime({ startTime, timezone, formatter, timezones }: { startTime: string; timezone: string; formatter: Intl.DateTimeFormat; timezones: ReturnType<typeof useTimezones>['data'] }) {
  const start = new Date(startTime)

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          display: 'block',
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          mb: 0.5,
        }}
      >
        Student's Local Time
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.8125rem' }}
      >
        {formatter.format(start)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        <strong>Timezone:</strong> {formatTimezoneLabel(timezone, timezones)}
      </Typography>
    </Box>
  )
}

function GroupParticipantInlineDetails({ booking }: { booking: Booking }) {
  const { data: timezones } = useTimezones()
  const studentFormatter = React.useMemo(() => {
    if (!booking.timezone) return null
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: booking.timezone,
        timeZoneName: 'short',
      })
    } catch {
      return null
    }
  }, [booking.timezone])

  const showStudentTime = booking.timezone && booking.timezone !== LOCAL_TZ && studentFormatter

  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }} onClick={(e) => e.stopPropagation()}>
      <Stack spacing={2}>
        {!showStudentTime && booking.timezone && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            <strong>Timezone:</strong> {booking.timezone}
          </Typography>
        )}

        {showStudentTime && (
          <StudentLocalTime
            startTime={booking.startTime}
            timezone={booking.timezone}
            formatter={studentFormatter}
            timezones={timezones}
          />
        )}

        {booking.notes && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                display: 'block',
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                mb: 0.5,
              }}
            >
              Student Notes
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8125rem' }}>
              {booking.notes}
            </Typography>
          </Box>
        )}

        {/* Dash divider followed by concise Booking ID and Creation details */}
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

        <Box
          sx={{
            color: 'text.secondary',
            typography: 'caption',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 0.75,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Box sx={{ fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}>
            Booking ID: {booking.id.slice(0, 8).toUpperCase()}
          </Box>
          <Box sx={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>•</Box>
          {booking.createdAt && (
            <Box sx={{ fontSize: '0.7rem', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Created: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.createdAt))}
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

function HeaderParticipantActions({
  booking,
  onCancelClick,
  onNoShowClick,
  onFollowUpClick,
  onSendEmailClick,
}: {
  booking: Booking
  onCancelClick: (e: React.MouseEvent) => void
  onNoShowClick: (e: React.MouseEvent) => void
  onFollowUpClick: (e: React.MouseEvent) => void
  onSendEmailClick: (e: React.MouseEvent) => void
}) {
  const { user } = useAuth()
  const { canMarkNoShow } = useBookingStatusUpdate()
  const { isCoach, isAdmin } = usePermissions()

  const showNoShow = canMarkNoShow(booking)
  const showFollowUp =
    booking.status === 'COMPLETED' &&
    user &&
    ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'].includes(user.role)
  const canSendEmail = (isCoach || isAdmin) && !!booking.studentId

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" onClick={(e) => e.stopPropagation()}>
      {canSendEmail && (
        <Tooltip title="Send Email">
          <IconButton
            size="small"
            color="primary"
            onClick={onSendEmailClick}
            sx={{
              p: 0.5,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
              },
            }}
          >
            <Mail size={15} />
          </IconButton>
        </Tooltip>
      )}

      {booking.status === 'CONFIRMED' && (
        <>
          <Tooltip title="Cancel Booking">
            <IconButton
              size="small"
              color="error"
              onClick={onCancelClick}
              sx={{
                p: 0.5,
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                },
              }}
            >
              <XCircle size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Reschedule Booking">
            <IconButton
              size="small"
              color="primary"
              component="a"
              href={`/reschedule/${booking.id}${booking.rescheduleToken ? `?token=${booking.rescheduleToken}` : ''}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              sx={{
                p: 0.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                },
              }}
            >
              <Calendar size={15} />
            </IconButton>
          </Tooltip>
        </>
      )}

      {showNoShow && (
        <Tooltip title="Mark as No Show">
          <IconButton
            size="small"
            color="warning"
            onClick={onNoShowClick}
            sx={{
              p: 0.5,
              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.15),
              },
            }}
          >
            <Clock size={15} />
          </IconButton>
        </Tooltip>
      )}

      {showFollowUp && (
        <Tooltip title="Book Follow-Up">
          <IconButton
            size="small"
            color="secondary"
            onClick={onFollowUpClick}
            sx={{
              p: 0.5,
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.15),
              },
            }}
          >
            <CalendarPlus size={15} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

function GroupParticipantsList({
  bookings,
  selectedId,
  onSelect,
  capacity,
  onCancelClick,
  onNoShowClick,
  onFollowUpClick,
  onSendEmailClick,
}: GroupParticipantsListProps & {
  onCancelClick: (booking: Booking) => void
  onNoShowClick: (booking: Booking) => void
  onFollowUpClick: (booking: Booking) => void
  onSendEmailClick: (booking: Booking) => void
}) {
  const theme = useTheme()
  const active = bookings.filter((b) => b.status !== 'CANCELLED')
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED')
  const sorted = [...active, ...cancelled]
  const activeCount = active.length

  const label = `Invitees: ${activeCount}${capacity ? ` of ${capacity}` : ''} spots filled`

  return (
    <BookingSection label={label} icon={<Users size={16} />}>
      <Stack
        spacing={1}
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.text.secondary, 0.15),
            borderRadius: '3px',
          },
        }}
      >
        {sorted.map((booking) => {
          const isSelected = booking.id === selectedId
          const isCancelled = booking.status === 'CANCELLED'

          return (
            <Box
              key={booking.id}
              onClick={() => onSelect(booking.id)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                py: 1.5,
                px: 1.75,
                borderRadius: 1.5,
                cursor: 'pointer',
                borderLeft: '3px solid',
                borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                bgcolor: isSelected
                  ? alpha(theme.palette.primary.main, 0.08)
                  : 'transparent',
                border: '1px solid',
                borderColor: isSelected
                  ? alpha(theme.palette.primary.main, 0.2)
                  : 'divider',
                transition: 'all 0.2s ease',
                opacity: isCancelled ? 0.6 : 1,
                '&:hover': {
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.12)
                    : 'action.hover',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, mr: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      bgcolor: alpha(theme.palette.secondary.main, 0.08),
                      color: theme.palette.secondary.main,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {toTitleCase(booking.studentName)
                      .split(' ')
                      .map((name) => name[0])
                      .join('')
                      .toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: '0.8125rem',
                        color: isSelected ? 'primary.main' : 'text.primary',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {booking.studentId ? (
                        <MuiLink
                          component={Link}
                          to={`/students/${booking.studentId}`}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            color: 'inherit',
                            textDecoration: 'none',
                            '&:hover': {
                              color: 'primary.main',
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {toTitleCase(booking.studentName)}
                        </MuiLink>
                      ) : (
                        toTitleCase(booking.studentName)
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {booking.studentEmail}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                  <BookingStatusBadge status={booking.status} useAttendanceLabels />

                  {/* Inline Header Action Icons next to badge when active */}
                  {isSelected && (
                    <HeaderParticipantActions
                      booking={booking}
                      onCancelClick={(e) => {
                        e.stopPropagation()
                        onCancelClick(booking)
                      }}
                      onNoShowClick={(e) => {
                        e.stopPropagation()
                        onNoShowClick(booking)
                      }}
                      onFollowUpClick={(e) => {
                        e.stopPropagation()
                        onFollowUpClick(booking)
                      }}
                      onSendEmailClick={(e) => {
                        e.stopPropagation()
                        onSendEmailClick(booking)
                      }}
                    />
                  )}
                </Stack>
              </Box>

              <Collapse in={isSelected} timeout="auto" unmountOnExit>
                <GroupParticipantInlineDetails booking={booking} />
              </Collapse>
            </Box>
          )
        })}
      </Stack>
    </BookingSection>
  )
}

export function SlotSessionPanel({ bookings }: SlotSessionPanelProps) {
  const theme = useTheme()
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [followUpBooking, setFollowUpBooking] = useState<Booking | null>(null)
  const [emailBooking, setEmailBooking] = useState<Booking | null>(null)
  
  const {
    handleStatusUpdate,
    cancelBooking,
    setCancelBooking,
    handleCancelConfirm,
    isPending,
  } = useBookingStatusUpdate()

  const representativeBooking = bookings[0]

  if (!representativeBooking) return null

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId)
  const capacity = representativeBooking.scheduleSlot?.capacity ?? representativeBooking.event?.maxParticipantCount ?? null

  return (
    <Box>
      {/* Cancellation warning displayed at the top if selected participant is cancelled */}
      {selectedBooking && selectedBooking.status === 'CANCELLED' && selectedBooking.cancellationReason && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'error.lighter',
            border: '1px solid',
            borderColor: 'error.light',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
              Booking Cancelled
            </Typography>
            <Typography variant="body2" color="error.dark">
              <strong>Reason:</strong> {selectedBooking.cancellationReason}
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4,
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Event details, participants list with inline details and actions, location, schedule, coach */}
        <Stack spacing={2}>
          <EventTeamSection booking={representativeBooking} />
          
          <GroupParticipantsList
            bookings={bookings}
            selectedId={selectedBookingId}
            onSelect={setSelectedBookingId}
            capacity={capacity}
            onCancelClick={(b) => handleStatusUpdate(b, 'CANCELLED', 'Cancel')}
            onNoShowClick={(b) => handleStatusUpdate(b, 'NO_SHOW', 'No Show')}
            onFollowUpClick={(b) => {
              setFollowUpBooking(b)
              setIsFollowUpOpen(true)
            }}
            onSendEmailClick={(b) => setEmailBooking(b)}
          />
          
          <LocationSection booking={representativeBooking} />
          <ScheduleSection booking={representativeBooking} />
          <CoachSection booking={representativeBooking} />
        </Stack>

        {/* Right Column: Timeline / Questions / Notes tabs */}
        <Box sx={{ position: 'relative', height: '100%', minHeight: { md: '360px', xs: 'auto' } }}>
          {selectedBooking ? (
            <BookingDetailsRightSection booking={selectedBooking} />
          ) : (
            <Box
              sx={{
                position: { md: 'absolute', xs: 'static' },
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                bgcolor: 'background.paper',
                pt: 6,
                pb: 3,
                px: 3,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.02)}`,
                minHeight: { xs: '200px', md: 'auto' },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.04)}`,
                  borderColor: alpha(theme.palette.primary.main, 0.16),
                },
              }}
            >
              <Users size={32} color={theme.palette.text.secondary} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500} align="center">
                Please select a student from the invitees on the left to view that student's timeline, their question and the session log.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Action Dialogs */}
      <CancelBookingDialog
        isOpen={!!cancelBooking}
        booking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleCancelConfirm}
        isLoading={isPending}
      />
      <BookFollowUpDialog
        isOpen={isFollowUpOpen}
        booking={followUpBooking || representativeBooking}
        onClose={() => {
          setIsFollowUpOpen(false)
          setFollowUpBooking(null)
        }}
      />
      {emailBooking && (
        <SendEmailDialog
          open={!!emailBooking}
          onClose={() => setEmailBooking(null)}
          studentId={emailBooking.studentId!}
          studentName={emailBooking.studentName}
          studentEmail={emailBooking.studentEmail}
        />
      )}
    </Box>
  )
}
