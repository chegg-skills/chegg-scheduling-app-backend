import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { Event } from '@/types'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { toTitleCase } from '@/utils/toTitleCase'

interface EventDetailOverviewProps {
    event: Event
}

const TOOLTIPS = {
    INTERACTION_TYPE: "Defines the session format (e.g., 1-on-1, Group) and technical requirements.",
    ASSIGNMENT: "The algorithm used to distribute sessions among coaches (e.g., Round Robin ensures balanced load).",
    LEADERSHIP: "Specifies who has primary control over session flow and student interaction.",
    BUFFER: "Mandatory break assigned after this session ends to prevent back-to-back bookings.",
    NOTICE: "Minimum lead time required for a student to book this event.",
    BOOKING_MODE: "Fixed Slots use predefined times; Flexible slots scan for overlapping coach availability."
}

export function EventDetailOverview({ event }: EventDetailOverviewProps) {
    const fixedLeadHost = event.fixedLeadHostId
        ? event.hosts.find((host) => host.hostUserId === event.fixedLeadHostId)?.hostUser ?? null
        : null

    const formatEnumLabel = (val: string) => {
        if (!val) return ''
        return val
            .split(/[_-]/)
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
            .join(' ')
    }

    const DataField = ({ label, value, tooltip, sm = 4 }: { label: string, value: string | number, tooltip?: string, sm?: number }) => (
        <Grid size={{ xs: 12, sm: sm }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
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
                    value={`${toTitleCase(event.interactionType.name)} (${formatEnumLabel(event.interactionType.key)})`}
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
                <DataField label="Minimum notice" value={`${event.minimumNoticeMinutes} min`} tooltip={TOOLTIPS.NOTICE} />
                <DataField label="Buffer after session" value={`${event.bufferAfterMinutes} min`} tooltip={TOOLTIPS.BUFFER} />
                <DataField
                    label="Allowed weekdays"
                    value={event.allowedWeekdays.length > 0
                        ? event.allowedWeekdays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
                        : 'All days'
                    }
                />

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
                        value={fixedLeadHost ? `${toTitleCase(fixedLeadHost.firstName)} ${toTitleCase(fixedLeadHost.lastName)}` : 'Not assigned'}
                    />
                )}
                <DataField label="Round robin" value={event.interactionType.supportsRoundRobin ? 'Enabled' : 'Disabled'} />
                <DataField label="Multiple coaches" value={event.interactionType.supportsMultipleHosts ? 'Supported' : 'Not supported'} />
                <DataField label="Co-hosting support" value={event.interactionType.supportsSimultaneousCoaches ? 'Supported' : 'Not supported'} />

                <Spacer />

                {/* Capacity & Limits */}
                <DataField label="Coaches (Min / Max)" value={`${event.interactionType.minHosts} / ${event.interactionType.maxHosts ?? '∞'}`} />
                <DataField label="Participants (Min / Max)" value={`${event.minParticipantCount ?? 1} / ${event.maxParticipantCount ?? '∞'}`} />
            </Grid>
        </Paper>
    )
}
