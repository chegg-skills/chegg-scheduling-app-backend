import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useInteractionTypeUsage } from '@/hooks/useInteractionTypes'
import { Badge } from '@/components/shared/Badge'

interface InteractionTypeUsageListProps {
    interactionTypeId: string
}

export function InteractionTypeUsageList({ interactionTypeId }: InteractionTypeUsageListProps) {
    const { data: usage, isLoading } = useInteractionTypeUsage(interactionTypeId)

    if (isLoading) {
        return <Typography variant="body2">Loading usage data...</Typography>
    }

    if (!usage || usage.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                No active events found using this interaction type.
            </Typography>
        )
    }

    return (
        <Stack spacing={1}>
            {usage.map((item) => (
                <Box
                    key={item.id}
                    sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            ID: {item.id}
                        </Typography>
                    </Box>
                    <Badge label={item.team.name} variant="gray" />
                </Box>
            ))}
        </Stack>
    )
}
