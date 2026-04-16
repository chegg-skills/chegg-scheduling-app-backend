import Chip from '@mui/material/Chip'

type BadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantSx: Record<BadgeVariant, object> = {
  green: { bgcolor: '#defbe6', color: '#198038' },
  red: { bgcolor: '#fff1f1', color: '#a2191f' },
  blue: { bgcolor: '#edf5ff', color: '#0043ce' },
  yellow: { bgcolor: '#fcf4d6', color: '#8d7000' },
  gray: { bgcolor: '#f4f4f4', color: '#525252' },
}

export function Badge({ label, variant = 'gray', className, ...props }: BadgeProps & object) {
  return (
    <Chip
      label={label}
      size="small"
      className={className}
      sx={{
        ...variantSx[variant],
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 20,
        borderRadius: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        '& .MuiChip-label': { px: 1 },
      }}
      {...props}
    />
  )
}
