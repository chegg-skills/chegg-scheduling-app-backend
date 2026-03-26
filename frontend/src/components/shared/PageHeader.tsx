import type { ReactNode } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        mb: 3,
        backgroundColor: "white",
        borderRadius: 1.5,
        border: 1,
        borderColor: "#E5E7EB",
      }}
      padding={2}
    >
      <Stack spacing={0.5}>
        <Typography variant="h5">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Stack>
      {actions ? <Stack direction="row" spacing={1.5}>{actions}</Stack> : null}
    </Stack>
  )
}
