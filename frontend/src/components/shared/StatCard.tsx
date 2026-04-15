import { useTheme, alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

export interface StatCardProps {
  label: string
  value: number | string
  helperText?: string
  icon?: ReactNode
  accent?: 'orange' | 'purple' | 'teal' | 'green'
}

export function StatCard({ label, value, helperText, icon, accent = 'orange' }: StatCardProps) {
  const theme = useTheme()

  const accentMap = {
    orange: {
      color: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    purple: {
      color: theme.palette.secondary.main,
      backgroundColor: alpha(theme.palette.secondary.main, 0.08),
    },
    teal: {
      color: theme.palette.info.main,
      backgroundColor: alpha(theme.palette.info.main, 0.08),
    },
    green: {
      color: theme.palette.success.main,
      backgroundColor: alpha(theme.palette.success.main, 0.08),
    },
  }

  const accentStyle = accentMap[accent]

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        minHeight: 120,
        borderRadius: 2,
        borderColor: 'divider',
        backgroundColor: accentStyle.backgroundColor.replace('0.08', '0.06'),
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: accentStyle.color,
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px -8px ${accentStyle.backgroundColor.replace('0.08', '0.2')}`,
        },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={{
          p: 2.25,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          '&:last-child': { pb: 2.25 },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="overline"
                noWrap
                sx={{
                  color: '#525252', // Darker gray for overline
                  fontWeight: 800, // Even bolder
                  letterSpacing: '0.1em',
                  display: 'block',
                }}
              >
                {label}
              </Typography>
              <Typography
                variant={typeof value === 'string' && value.length > 15 ? 'h6' : 'h5'}
                sx={{
                  mt: 0.5,
                  color: '#3A2C41',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={String(value)}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
            </Box>

            {icon ? (
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentStyle.color,
                  bgcolor: accentStyle.backgroundColor,
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  '.MuiCard-root:hover &': {
                    transform: 'scale(1.1)',
                  },
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
