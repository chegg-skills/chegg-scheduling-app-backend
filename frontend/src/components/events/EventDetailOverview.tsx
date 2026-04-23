import { useState } from 'react'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import { Link as LinkIcon, Copy, Check } from 'lucide-react'
import type { Event } from '@/types'
import { InfoTooltip } from '@/components/shared/ui/InfoTooltip'
import { toTitleCase } from '@/utils/toTitleCase'

interface EventDetailOverviewProps {
  event: Event
}

const TOOLTIPS = {
  INTERACTION_TYPE: 'Defines the session format (e.g., 1-on-1, Group) and technical requirements.',
  ASSIGNMENT:
    'The algorithm used to distribute sessions among coaches (e.g., Round Robin ensures balanced load).',
  LEADERSHIP: 'Specifies who has primary control over session flow and student interaction.',
  BUFFER: 'Mandatory break assigned after this session ends to prevent back-to-back bookings.',
  NOTICE: 'Minimum lead time required for a student to book this event.',
  BOOKING_MODE:
    'Fixed Slots use predefined times; Flexible slots scan for overlapping coach availability.',
}

export function EventDetailOverview({ event }: EventDetailOverviewProps) {
  const [copied, setCopied] = useState(false)
  const bookingUrl = `${window.location.origin}/book/event/${event.publicBookingSlug}`

  const handleCopy = () => {
    if (event.publicBookingSlug) {
      navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const fixedLeadCoach = event.fixedLeadCoachId
    ? (event.coaches.find((coach) => coach.coachUserId === event.fixedLeadCoachId)?.coachUser ?? null)
    : null

  const formatEnumLabel = (val: string) => {
    if (!val) return ''
    return val
      .split(/[_-]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ')
  }

  const DataField = ({
    label,
    value,
    tooltip,
    sm = 4,
  }: {
    label: string
    value: string | number
    tooltip?: string
    sm?: number
  }) => (
    <Grid size={{ xs: 12, sm: sm }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography
          variant="caption"
          color="text.primary"
          sx={{ fontWeight: 600, fontSize: '0.85rem' }}
        >
          {label}
        </Typography>
        {tooltip && <InfoTooltip title={tooltip} size={12} />}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Grid>
  )

  const Spacer = () => <Grid size={12} sx={{ height: 8 }} />

  // Note: Backend interaction info details for the selected event's interactionType enum
  // are often needed here. For now we use the event directly which should have been populated.
  // If event.interactionTypeInfo is missing, we might need a separate hook.

  return (
    <Paper component="section" variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
      <Typography
        variant="subtitle2"
        color="text.primary"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 1,
          mb: 2,
          fontSize: '0.75rem',
          fontWeight: 800,
        }}
      >
        General Details
      </Typography>

      <Grid container spacing={2}>
        {/* Core Configuration */}
        <DataField label="Offering" value={toTitleCase(event.offering.name)} />
        <DataField
          label="Interaction type"
          value={formatEnumLabel(event.interactionType)}
          tooltip={TOOLTIPS.INTERACTION_TYPE}
        />
        <DataField
          label="Booking mode"
          value={event.bookingMode === 'FIXED_SLOTS' ? 'Fixed Slots' : 'Flexible'}
          tooltip={TOOLTIPS.BOOKING_MODE}
        />
        <DataField label="Duration" value={`${event.durationSeconds / 60} min`} />
        <DataField label="Location type" value={formatEnumLabel(event.locationType)} />
        {event.locationValue && <DataField label="Location" value={event.locationValue} />}

        <Spacer />

        {/* Scheduling & Policies */}
        <DataField
          label="Minimum notice"
          value={`${event.minimumNoticeMinutes} min`}
          tooltip={TOOLTIPS.NOTICE}
        />
        <DataField
          label="Buffer after session"
          value={`${event.bufferAfterMinutes} min`}
          tooltip={TOOLTIPS.BUFFER}
        />
        <DataField
          label="Allowed weekdays"
          value={
            event.weeklyAvailability && event.weeklyAvailability.length > 0
              ? Array.from(new Set(event.weeklyAvailability.map((a) => a.dayOfWeek)))
                .sort()
                .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                .join(', ')
              : event.allowedWeekdays.length > 0
                ? event.allowedWeekdays
                  .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                  .join(', ')
                : 'All days'
          }
        />
        {event.weeklyAvailability && event.weeklyAvailability.length > 0 && (
          <Grid size={12}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Availability Windows
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {Array.from({ length: 7 }, (_, i) => i).map((dayIndex) => {
                const daySlots = event.weeklyAvailability.filter((a) => a.dayOfWeek === dayIndex)
                if (daySlots.length === 0) return null
                return (
                  <Box
                    key={dayIndex}
                    sx={{
                      px: 1,
                      py: 0.5,
                      bgcolor: 'action.selected',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    <strong>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]}</strong>:{' '}
                    {daySlots.map((s) => `${s.startTime}-${s.endTime}`).join(', ')}
                  </Box>
                )
              })}
            </Box>
          </Grid>
        )}

        <Spacer />

        {/* Coaching & Leadership */}
        <DataField
          label="Assignment strategy"
          value={formatEnumLabel(event.assignmentStrategy)}
          tooltip={TOOLTIPS.ASSIGNMENT}
        />
        <DataField
          label="Leadership strategy"
          value={formatEnumLabel(event.sessionLeadershipStrategy)}
          tooltip={TOOLTIPS.LEADERSHIP}
        />
        {event.sessionLeadershipStrategy === 'FIXED_LEAD' && (
          <DataField
            label="Fixed lead coach"
            value={
              fixedLeadCoach
                ? `${toTitleCase(fixedLeadCoach.firstName)} ${toTitleCase(fixedLeadCoach.lastName)}`
                : 'Not assigned'
            }
          />
        )}
        <DataField
          label="Multi-coach pool"
          value={event.assignmentStrategy === 'ROUND_ROBIN' ? 'Enabled' : 'Disabled'}
        />

        <Spacer />

        {/* Capacity & Limits */}
        <DataField
          label="Coaches (Min / Max)"
          value={`${event.minCoachCount} / ${event.maxCoachCount ?? '∞'}`}
        />
        <DataField
          label="Participants (Min / Max)"
          value={`${event.minParticipantCount ?? 1} / ${event.maxParticipantCount ?? '∞'}`}
        />

        {/* Public Booking Link Section */}
        <Grid size={12}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              border: '1px dashed',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <LinkIcon size={20} style={{ color: 'var(--mui-palette-primary-main)' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Public Booking Link
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.publicBookingSlug
                    ? bookingUrl
                    : 'No slug configured. Please check event settings.'}
                </Typography>
              </Box>
            </Box>
            <Tooltip title={copied ? 'Copied!' : 'Copy Link'} arrow>
              <IconButton
                onClick={handleCopy}
                disabled={!event.publicBookingSlug}
                color={copied ? 'success' : 'primary'}
                sx={{
                  bgcolor: (theme) =>
                    alpha(
                      copied ? theme.palette.success.main : theme.palette.primary.main,
                      0.1
                    ),
                  '&:hover': {
                    bgcolor: (theme) =>
                      alpha(
                        copied ? theme.palette.success.main : theme.palette.primary.main,
                        0.2
                      ),
                  },
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
