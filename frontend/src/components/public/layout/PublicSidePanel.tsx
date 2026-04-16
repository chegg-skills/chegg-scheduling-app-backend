import * as React from 'react'
import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'

interface PublicSidePanelProps {
  children: React.ReactNode
}

/**
 * PublicSidePanel encapsulates the persistent left column
 * used for branding and session summaries.
 */
export function PublicSidePanel({ children }: PublicSidePanelProps) {
  return (
    <Box
      sx={{
        width: 380,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: (theme) => alpha(theme.palette.secondary.main, 0.08),
        p: 3,
        height: '100%',
        overflowY: 'auto',
        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.02),
        display: { xs: 'none', lg: 'block' },
      }}
    >
      {children}
    </Box>
  )
}
