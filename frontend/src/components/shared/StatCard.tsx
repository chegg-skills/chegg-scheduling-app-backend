import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

const accentStyles = {
  orange: {
    color: '#EB7100',
    backgroundColor: 'rgba(235, 113, 0, 0.10)',
  },
  purple: {
    color: '#522D9B',
    backgroundColor: 'rgba(82, 45, 155, 0.10)',
  },
  teal: {
    color: '#397F89',
    backgroundColor: 'rgba(57, 127, 137, 0.10)',
  },
  green: {
    color: '#2E7D32',
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
  },
} as const

export interface StatCardProps {
  label: string
  value: number | string
  helperText?: string
  icon?: ReactNode
  accent?: keyof typeof accentStyles
}

export function StatCard({
  label,
  value,
  helperText,
  icon,
  accent = 'orange',
}: StatCardProps) {
  const accentStyle = accentStyles[accent]

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        minHeight: 120,
        borderRadius: 1.2, // 12px - Aligns with Paper standard
        borderColor: 'divider',
        backgroundColor: '#FFFFFF',
        backgroundImage: `linear-gradient(${accentStyle.backgroundColor}, ${accentStyle.backgroundColor})`,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ p: 2.25, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:last-child': { pb: 2.25 } }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="overline"
                noWrap
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  display: 'block'
                }}
              >
                {label}
              </Typography>
              <Typography
                variant={typeof value === 'string' && value.length > 15 ? 'h6' : 'h5'}
                sx={{
                  mt: 0.5,
                  color: '#111827',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={String(value)}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
            </Box>

            {icon ? (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentStyle.color,
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            ) : null}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {helperText ?? 'Updated from the current application snapshot'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
