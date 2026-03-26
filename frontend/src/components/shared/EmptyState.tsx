import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Paper variant="outlined" sx={{ borderStyle: 'dashed', p: 6, textAlign: 'center' }}>
      <Stack spacing={2} alignItems="center">
        <Box sx={{ color: 'text.secondary' }}>
          <Inbox size={48} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
        {action}
      </Stack>
    </Paper>
  )
}
