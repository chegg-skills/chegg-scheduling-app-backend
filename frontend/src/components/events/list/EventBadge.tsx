import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import type { LucideIcon } from 'lucide-react'

export const BADGE_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1.25,
  py: 0.4,
  borderRadius: 1.5,
  bgcolor: 'grey.50',
  color: 'text.secondary',
  border: '1px solid',
  borderColor: 'grey.100',
} as const

export const BADGE_LABEL_SX = {
  fontWeight: 600,
  fontSize: '0.725rem',
  letterSpacing: '0.01em',
} as const

interface EventBadgeProps {
  icon: LucideIcon
  iconColor: string
  label: string
  tooltip?: string
}

export function EventBadge({ icon: Icon, iconColor, label, tooltip }: EventBadgeProps) {
  const badge = (
    <Box sx={BADGE_SX}>
      <Icon size={13} style={{ opacity: 0.8, color: iconColor }} />
      <Typography variant="caption" sx={BADGE_LABEL_SX}>
        {label}
      </Typography>
    </Box>
  )

  if (tooltip) {
    return <Tooltip title={tooltip} arrow>{badge}</Tooltip>
  }
  return badge
}
