import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface UserFormSectionProps {
  title: string
  children: ReactNode
}

export function UserFormSection({ title, children }: UserFormSectionProps) {
  return (
    <Stack spacing={2}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 700, display: 'block', mb: 1 }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  )
}
