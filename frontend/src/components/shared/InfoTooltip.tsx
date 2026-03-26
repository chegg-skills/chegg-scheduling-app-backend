import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
    title: string
    size?: number
}

/**
 * A reusable information icon that shows a description in a tooltip.
 */
export function InfoTooltip({ title, size = 14 }: InfoTooltipProps) {
    return (
        <Tooltip
            title={title}
            arrow
            placement="top"
            enterTouchDelay={0}
            leaveTouchDelay={3000}
            sx={{ cursor: 'help' }}
        >
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ml: 0.5,
                    color: 'text.secondary',
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 },
                    verticalAlign: 'middle'
                }}
            >
                <Info size={size} />
            </Box>
        </Tooltip>
    )
}
