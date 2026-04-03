import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import { Award, ChevronRight } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { PageSpinner } from '@/components/shared/Spinner'
import type { PublicEventSummary } from '@/types'

interface EventStepProps {
    events: PublicEventSummary[]
    loading: boolean
    error?: unknown
    emptyMessage?: string
    selectedEventId: string | null
    onSelect: (eventId: string) => void
}

export function EventStep({
    events,
    loading,
    error,
    emptyMessage = 'No events are available right now.',
    selectedEventId,
    onSelect
}: EventStepProps) {
    if (loading) return <PageSpinner />
    if (error) return <ErrorAlert message="Failed to load events." />
    if (events.length === 0) {
        return <Typography color="text.secondary">{emptyMessage}</Typography>
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {events.map((event) => (
                <Card
                    key={event.id}
                    variant="outlined"
                    sx={{
                        borderColor: selectedEventId === event.id ? 'primary.main' : 'divider',
                        borderWidth: selectedEventId === event.id ? 2 : 1
                    }}
                >
                    <CardActionArea onClick={() => onSelect(event.id)}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'secondary.light', color: 'secondary.main' }}>
                                        <Award size={24} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={600}>{event.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {Math.floor(event.durationSeconds / 60)} minutes • {event.locationType}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ChevronRight color="grey" />
                            </Stack>
                        </CardContent>
                    </CardActionArea>
                </Card>
            ))}
        </Box>
    )
}
