import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { Event } from '@/types'

interface EventDetailOverviewProps {
    event: Event
}

export function EventDetailOverview({ event }: EventDetailOverviewProps) {
    return (
        <Paper component="section" variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    mb: 3,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                }}
            >
                General Details
            </Typography>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Offering
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                        {event.offering.name}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Interaction type
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                        {event.interactionType.name} ({event.interactionType.key})
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Assignment strategy
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                        {event.assignmentStrategy}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Booking mode
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                        {event.bookingMode === 'FIXED_SLOTS' ? 'Fixed Slots' : 'Flexible'}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Location type
                    </Typography>
                    <Typography variant="body2">{event.locationType}</Typography>
                </Grid>
                {event.locationValue && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                            Location
                        </Typography>
                        <Typography variant="body2">{event.locationValue}</Typography>
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Duration
                    </Typography>
                    <Typography variant="body2">{event.durationSeconds / 60} min</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Round robin
                    </Typography>
                    <Typography variant="body2">
                        {event.interactionType.supportsRoundRobin ? 'Enabled' : 'Disabled'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Multiple hosts
                    </Typography>
                    <Typography variant="body2">
                        {event.interactionType.supportsMultipleHosts ? 'Supported' : 'Not supported'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Hosts (Min / Max)
                    </Typography>
                    <Typography variant="body2">
                        {event.interactionType.minHosts} / {event.interactionType.maxHosts ?? '∞'}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Participants (Min / Max)
                    </Typography>
                    <Typography variant="body2">
                        {event.minParticipantCount ?? 1} / {event.maxParticipantCount ?? '∞'}
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Minimum notice
                    </Typography>
                    <Typography variant="body2">{event.minimumNoticeMinutes} min</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        Allowed weekdays
                    </Typography>
                    <Typography variant="body2">
                        {event.allowedWeekdays.length > 0
                            ? event.allowedWeekdays
                                .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                                .join(', ')
                            : 'All days'}
                    </Typography>
                </Grid>
            </Grid>
        </Paper>
    )
}
