import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'

export type BadgeColor = 
  | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary'
  | 'green' | 'red' | 'blue' | 'yellow' | 'gray'

interface BadgeProps {
  label: string
  color?: BadgeColor
  variant?: 'filled' | 'outlined' | 'soft'
  className?: string
  sx?: object
}

const legacyMap: Record<string, string> = {
  green: 'success',
  red: 'error',
  blue: 'info',
  yellow: 'warning',
  gray: 'secondary'
}

/**
 * Enhanced Badge component for status and labels.
 * Supports theme palette colors and modern 'soft' variant.
 */
export function Badge({ 
  label, 
  color = 'gray', 
  variant = 'soft', 
  className, 
  sx = {},
  ...props 
}: BadgeProps) {
  const theme = useTheme()
  
  // Resolve color (handle legacy mapping)
  const resolvedColor = legacyMap[color] || color
  const themeColor = theme.palette[resolvedColor as 'primary'] as { main?: string; dark?: string } | undefined
  const grey = theme.palette.grey

  const mainColor = themeColor?.main ?? grey[500]
  const darkColor = themeColor?.dark ?? grey[800]
  const midColor = themeColor?.main ?? grey[700]

  const getStyles = () => {
    if (variant === 'soft') {
      return {
        bgcolor: alpha(mainColor, 0.12),
        color: darkColor,
        border: 'none'
      }
    }
    if (variant === 'outlined') {
      return {
        bgcolor: 'transparent',
        color: midColor,
        border: `1px solid ${alpha(midColor, 0.5)}`
      }
    }
    return {} // MUI default filled
  }

  return (
    <Chip
      label={label}
      size="small"
      className={className}
      sx={{
        ...getStyles(),
        fontWeight: 700,
        fontSize: '0.6875rem',
        height: 22,
        borderRadius: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        '& .MuiChip-label': { px: 1.2 },
        ...sx
      }}
      {...props}
    />
  )
}
