import * as React from 'react'
import Typography from '@mui/material/Typography'
import { LucideIcon } from 'lucide-react'

interface SummaryDetailProps {
    icon: LucideIcon
    label: string
    value: React.ReactNode
    color: string
}

export function SummaryDetail({
    icon: Icon,
    label,
    value,
    color,
}: SummaryDetailProps) {
    return (
        <>
            <Icon size={13} color={color} />
            <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                noWrap
                sx={{ pl: 1, fontSize: '0.8rem' }}
            >
                {label}
            </Typography>
            <Typography
                variant="caption"
                fontWeight={700}
                color="text.primary"
                noWrap
                sx={{
                    fontSize: '0.8rem',
                    pl: 2,
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                }}
            >
                {value}
            </Typography>
        </>
    )
}
