import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { Event } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { DataField } from '@/components/shared/ui/DataField'

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

  const Spacer = () => <Grid size={12} sx={{ height: 8 }} />

  // Note: Backend interaction info details for the selected event's interactionType enum
  // are often needed here. For now we use the event directly which should have been populated.
  // If event.interactionTypeInfo is missing, we might need a separate hook.

  return (
    <Paper component="section" variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
      <Grid container spacing={2}>
        {/* Core Configuration */}
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
      </Grid>
    </Paper>
  )
}
