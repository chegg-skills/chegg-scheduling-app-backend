import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { AlertTriangle, Clock, ExternalLink, Settings, Users, Sliders } from 'lucide-react'
import type { Event } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { DataField } from '@/components/shared/ui/DataField'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'

function LinkExpiryChip({ expiresAt }: { expiresAt: string }) {
  const expiry = new Date(expiresAt)
  const daysRemaining = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const isExpired = daysRemaining < 0
  const isCritical = !isExpired && daysRemaining <= 7
  const isWarning = !isExpired && !isCritical && daysRemaining <= 30

  const color = isExpired || isCritical ? '#DC2626' : isWarning ? '#D97706' : '#16A34A'
  const Icon = isExpired || isCritical || isWarning ? AlertTriangle : Clock

  const label = isExpired
    ? 'Link has expired'
    : daysRemaining === 0
      ? 'Expires today'
      : daysRemaining === 1
        ? 'Expires tomorrow'
        : `Expires in ${daysRemaining} days`

  const dateStr = expiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {dateStr}
      </Typography>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: '10px',
          bgcolor: alpha(color, 0.08),
          border: `1px solid ${alpha(color, 0.2)}`,
          color,
        }}
      >
        <Icon size={11} />
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<any> }) {
  const theme = useTheme()
  return (
    <Grid size={12}>
      <Box sx={{ mt: 1.5, mb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Icon size={16} color={theme.palette.primary.main} style={{ opacity: 0.85 }} />
          <Typography
            variant="caption"
            color="primary.main"
            sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.725rem' }}
          >
            {title}
          </Typography>
        </Stack>
        <Divider sx={{ mt: 0.5, borderColor: alpha(theme.palette.primary.main, 0.12) }} />
      </Box>
    </Grid>
  )
}

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
  const fixedLeadCoach = event.fixedLeadCoachId
    ? (event.coaches.find((coach) => coach.coachUserId === event.fixedLeadCoachId)?.coachUser ??
      null)
    : null

  const formatEnumLabel = (val: string) => {
    if (!val) return ''
    return val
      .split(/[_-]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ')
  }


  return (
    <Paper component="section" variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
      <Grid container spacing={2}>
        <SectionHeader title="Core Configuration" icon={Settings} />
        <DataField label="Event Type" value={toTitleCase(event.eventType.name)} />
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
        <DataField
          label="Join method"
          value={
            event.locationType === 'IN_PERSON'
              ? 'In Person'
              : event.locationType === 'CUSTOM'
                ? 'Custom Instructions'
                : (event.meetingLinkSource ?? 'COACH_ISV') === 'COACH_ISV'
                  ? "Coach's Zoom Link"
                  : 'Shared Event Link'
          }
          tooltip="Determines how students will join sessions booked for this event."
        />
        {event.locationType === 'VIRTUAL' && (event.meetingLinkSource ?? 'COACH_ISV') === 'COACH_ISV' ? (
          event.locationValue ? (
            <DataField
              label="Fallback event link"
              value={
                <Link
                  href={event.locationValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Join Session (Fallback)
                  <ExternalLink size={13} />
                </Link>
              }
              tooltip="Optional event-level link used as a fallback if the coach's link is unavailable."
            />
          ) : null
        ) : event.locationValue ? (
          <DataField
            label={
              event.locationType === 'IN_PERSON'
                ? 'Address'
                : event.locationType === 'CUSTOM'
                  ? 'Instructions'
                  : 'Location'
            }
            value={
              event.locationType === 'VIRTUAL' ? (
                <Link
                  href={event.locationValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Join Session
                  <ExternalLink size={13} />
                </Link>
              ) : (
                event.locationValue
              )
            }
          />
        ) : null}
        {(event.meetingLinkSource ?? 'COACH_ISV') === 'EVENT_LOCATION' && (
          <DataField
            label="Link expires"
            value={
              event.locationLinkExpiresAt ? (
                <LinkExpiryChip expiresAt={event.locationLinkExpiresAt} />
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: '10px',
                    bgcolor: alpha('#D97706', 0.08),
                    border: `1px solid ${alpha('#D97706', 0.2)}`,
                    color: '#D97706',
                  }}
                >
                  <AlertTriangle size={11} />
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                    No expiry set
                  </Typography>
                </Box>
              )
            }
            tooltip="The date when the event location URL expires."
          />
        )}
        {(event.meetingLinkSource ?? 'COACH_ISV') === 'EVENT_LOCATION' &&
          event.locationLinkReminderDays && (
            <DataField
              label="Expiry reminder"
              value={`${event.locationLinkReminderDays} day${event.locationLinkReminderDays === 1 ? '' : 's'} before expiry`}
              tooltip="An email reminder will be sent to the team lead this many days before the link expires."
            />
          )}
        <DataField
          label="Public booking link"
          value={
            <PublicBookingLinkCell
              type="event"
              slug={event.publicBookingSlug}
              isActive={event.isActive}
              variant="button"
            />
          }
          tooltip="Direct public booking link for this event."
        />

        <SectionHeader title="Scheduling & Policies" icon={Clock} />
        <DataField
          label="Minimum notice"
          value={
            event.minimumNoticeMinutes >= 60
              ? `${event.minimumNoticeMinutes / 60} hour${event.minimumNoticeMinutes / 60 === 1 ? '' : 's'}`
              : `${event.minimumNoticeMinutes} min`
          }
          tooltip={TOOLTIPS.NOTICE}
        />
        <DataField
          label="Buffer after session"
          value={`${event.bufferAfterMinutes} min`}
          tooltip={TOOLTIPS.BUFFER}
        />

        <SectionHeader title="Coaching & Leadership" icon={Users} />
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

        <SectionHeader title="Capacity & Limits" icon={Sliders} />
        <DataField
          label="Participant capacity"
          value={event.maxParticipantCount ? `Up to ${event.maxParticipantCount}` : 'Unlimited'}
        />
        {event.deferCoachReveal && (
          <DataField
            label="Coach reveal"
            value="Deferred"
            tooltip="Students receive no coach name or join URL at booking time. Admin reveals the coach manually before the session."
          />
        )}
        {event.allowAnonymousBooking && (
          <DataField
            label="Anonymous booking"
            value="Enabled"
            tooltip="Students receive a join link at the time of booking, but the coach's name and personal link remain hidden. Any pool coach may log the session and assign themselves retroactively."
          />
        )}
      </Grid>
    </Paper>
  )
}
