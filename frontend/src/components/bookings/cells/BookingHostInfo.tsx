import Typography from '@mui/material/Typography'
import type { SafeUser } from '@/types'

interface BookingHostInfoProps {
    host?: SafeUser | null
    onViewHost?: (userId: string) => void
}

export function BookingHostInfo({ host, onViewHost }: BookingHostInfoProps) {
    if (!host) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                N/A
            </Typography>
        )
    }

    return (
        <Typography
            variant="body2"
            onClick={() => onViewHost?.(host.id)}
            sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textDecoration: 'none',
                cursor: onViewHost ? 'pointer' : 'default',
                '&:hover': {
                    color: onViewHost ? 'primary.main' : 'inherit',
                    textDecoration: onViewHost ? 'underline' : 'none',
                },
            }}
        >
            {host.firstName} {host.lastName}
        </Typography>
    )
}
