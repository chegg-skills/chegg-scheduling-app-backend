import React from 'react'
import { Box, Typography, Stack, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 1.5,
        textTransform: 'uppercase',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </Typography>
  )
}

interface BookingSectionProps {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function BookingSection({ label, icon, children }: BookingSectionProps) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.02)}`,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.04)}`,
          borderColor: alpha(theme.palette.primary.main, 0.16),
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        {icon && (
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'text.secondary',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Box>{children}</Box>
    </Box>
  )
}
