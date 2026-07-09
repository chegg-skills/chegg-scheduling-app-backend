import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useTheme, alpha } from '@mui/material/styles'
import { ChevronDown, AlertCircle, XCircle } from 'lucide-react'
import { usePublicSessionUser } from '@/hooks/usePublicSessionUser'
import { useSlotDebugReport } from '@/hooks/queries/useSlotDebug'
import { formatDateInTimezone } from '@/utils/dateTimezone'
import type { SlotDebugCoachStatus, SlotDebugEntry } from '@/types'

export type ChipColor = 'success' | 'error' | 'warning' | 'default'

export function describeStatus(
  status: SlotDebugCoachStatus,
  fmtTime: (iso: string) => string
): { label: string; color: ChipColor } {
  switch (status.status) {
    case 'available':
      return { label: 'Available', color: 'success' }
    case 'conflict':
      return {
        label: `Conflict: ${status.conflictingEvent} (${fmtTime(status.conflictStart)}–${fmtTime(status.conflictEnd)})`,
        color: 'error',
      }
    case 'outside_availability':
      return {
        label: status.windows.length
          ? `Outside availability (set: ${status.windows.join(', ')})`
          : 'No availability set for this day',
        color: 'warning',
      }
    case 'exception_block':
      return { label: 'Blocked by an availability exception', color: 'warning' }
    case 'invalid_timezone':
      return { label: 'Coach has an invalid timezone setting', color: 'error' }
    case 'in_the_past':
      return { label: 'In the past', color: 'default' }
    case 'notice_window':
      return {
        label: `Minimum notice not met (${status.minimumNoticeMinutes} min required)`,
        color: 'warning',
      }
    case 'booking_window':
      return {
        label: `Beyond booking window (max ${status.maxBookingWindowDays} days)`,
        color: 'warning',
      }
    case 'recurrence_limit':
      return { label: 'Beyond the recurrence visibility limit', color: 'warning' }
    case 'capacity_full':
      return { label: 'Slot at full capacity', color: 'error' }
    default:
      return { label: 'Unavailable', color: 'default' }
  }
}

export function getStatusBadgeStyles(color: ChipColor, theme: any) {
  switch (color) {
    case 'success':
      return {
        bgcolor: theme.palette.success.light,
        color: '#223D44',
        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
      }
    case 'error':
      return {
        bgcolor: theme.palette.error.light,
        color: '#482034',
        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
      }
    case 'warning':
      return {
        bgcolor: theme.palette.warning.light,
        color: '#473C2C',
        border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
      }
    default:
      return {
        bgcolor: 'grey.100',
        color: 'text.secondary',
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      }
  }
}

export function SlotDebugRow({
  slot,
  fmtTime,
}: {
  slot: SlotDebugEntry
  fmtTime: (iso: string) => string
}) {
  const theme = useTheme()
  const timeLabel = `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}`

  return (
    <Accordion
      defaultExpanded={!slot.visible}
      disableGutters
      sx={{
        '&:before': { display: 'none' },
        border: slot.visible ? '1px solid' : '1px dotted',
        borderColor: slot.visible
          ? alpha(theme.palette.success.main, 0.25)
          : alpha(theme.palette.error.main, 0.35),
        bgcolor: slot.visible
          ? alpha(theme.palette.success.main, 0.04)
          : alpha(theme.palette.error.main, 0.04),
        borderRadius: 1.5,
        overflow: 'hidden',
        boxShadow: 'none',
        mb: 1.25,
      }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, pr: 1 }}>
          <Typography variant="body2" fontWeight={700} color="text.primary">
            {timeLabel}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label={slot.visible ? 'Available to Book' : 'Not Bookable'}
            sx={{
              fontWeight: 700,
              fontSize: '0.725rem',
              height: 22,
              borderRadius: 1.5,
              ...(slot.visible
                ? { bgcolor: 'success.light', color: '#223D44', border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }
                : { bgcolor: 'error.light', color: '#482034', border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }),
            }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2, pt: 0.5 }}>
        {slot.eventLevelStatus ? (
          (() => {
            const meta = describeStatus(slot.eventLevelStatus, fmtTime)
            const isPast = slot.eventLevelStatus.status === 'in_the_past'
            return (
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.5 }}>
                {isPast ? (
                  <XCircle size={16} color={theme.palette.text.secondary} />
                ) : meta.color === 'error' ? (
                  <XCircle size={16} color={theme.palette.error.main} />
                ) : (
                  <AlertCircle size={16} color={theme.palette.warning.main} />
                )}
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {meta.label}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    (Event-level rule)
                  </Typography>
                </Typography>
              </Stack>
            )
          })()
        ) : slot.coaches.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 1 }}>
            No coach detail available.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}
            >
              Coach Availability Details
            </Typography>
            {slot.coaches.map((c, index) => {
              const meta = describeStatus(c.status, fmtTime)
              const badgeStyle = getStatusBadgeStyles(meta.color, theme)
              const initials = c.coachName
                ? c.coachName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
                : 'CH'
              return (
                <Box key={c.coachId}>
                  {index > 0 && <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.4) }} />}
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: c.decidesVisibility ? 'primary.light' : 'secondary.light',
                          color: c.decidesVisibility ? 'primary.main' : 'secondary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {initials}
                      </Box>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {c.coachName}
                          {c.decidesVisibility && (
                            <Typography
                              component="span"
                              variant="caption"
                              color="primary.main"
                              fontWeight={700}
                              sx={{ ml: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}
                            >
                              (Decides Visibility)
                            </Typography>
                          )}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Chip
                      size="small"
                      label={meta.label}
                      sx={{ fontWeight: 700, fontSize: '0.725rem', height: 22, borderRadius: 1.5, ...badgeStyle }}
                    />
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

interface SlotDebugPanelProps {
  eventId: string | undefined
  selectedDate: Date
  selectedTimezone: string
  dateLabel: string
  show: boolean
  /** Booking currently being rescheduled — excluded from conflict checks so
   * its own prior time doesn't show as a false conflict for its coach. */
  excludeBookingId?: string
}

export function SlotDebugPanel({
  eventId,
  selectedDate,
  selectedTimezone,
  dateLabel,
  show,
  excludeBookingId,
}: SlotDebugPanelProps) {
  const theme = useTheme()
  const { isInternalUser } = usePublicSessionUser()
  const enabled = show && isInternalUser && !!eventId

  const dateString = React.useMemo(
    () => formatDateInTimezone(selectedDate, selectedTimezone),
    [selectedDate, selectedTimezone]
  )

  const fmtTime = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: selectedTimezone || undefined,
    })
    return (iso: string) => formatter.format(new Date(iso))
  }, [selectedTimezone])

  const { data, isLoading, isError } = useSlotDebugReport(
    eventId,
    dateString,
    selectedTimezone,
    enabled,
    excludeBookingId
  )

  if (!enabled) return null

  return (
    <Box
      sx={{
        width: { xs: '100%', lg: 360 },
        flexShrink: 0,
        p: { xs: 2, lg: 3 },
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Availability Debug
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          Diagnostics for {dateLabel}.
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box
        sx={{
          overflowY: 'auto',
          flexGrow: 1,
          pr: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
        }}
      >
        {isLoading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3, justifyContent: 'center' }}>
            <CircularProgress size={20} thickness={4} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Loading diagnostics...
            </Typography>
          </Stack>
        ) : isError ? (
          <Typography variant="body2" color="error" align="center">
            Failed to load debug report.
          </Typography>
        ) : data ? (
          <Stack spacing={1.5}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(2, 136, 209, 0.08) 0%, rgba(0, 0, 0, 0) 100%)'
                    : 'linear-gradient(135deg, rgba(2, 136, 209, 0.04) 0%, rgba(255, 255, 255, 0) 100%)',
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    {data.visibleSlots} of {data.totalSlots} slots visible
                  </Typography>
                  <Chip
                    size="small"
                    label={data.visibleSlots > 0 ? 'Active' : 'No Slots'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.675rem',
                      height: 18,
                      borderRadius: 1,
                      bgcolor: data.visibleSlots > 0 ? alpha(theme.palette.success.main, 0.15) : 'grey.200',
                      color: data.visibleSlots > 0 ? theme.palette.success.main : 'text.secondary',
                    }}
                  />
                </Stack>
                <Divider sx={{ my: 0.5, opacity: 0.6 }} />
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Booking Mode
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      {data.bookingMode === 'FIXED_SLOTS' ? 'Fixed Session Slots' : 'Flexible Availability'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Assignment Strategy
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      {data.assignmentStrategy === 'ROUND_ROBIN' ? 'Round Robin' : 'Direct Assignment'}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
            {data.slots.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                No slots configured for this date.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {data.slots.map((slot) => (
                  <SlotDebugRow key={slot.startTime} slot={slot} fmtTime={fmtTime} />
                ))}
              </Stack>
            )}
          </Stack>
        ) : null}
      </Box>
    </Box>
  )
}
