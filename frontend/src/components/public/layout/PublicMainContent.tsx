import * as React from 'react'
import Box from '@mui/material/Box'

interface PublicMainContentProps {
  children: React.ReactNode
}

/**
 * PublicMainContent handles the right column which contains
 * the dynamic step content and footer.
 */
export function PublicMainContent({ children }: PublicMainContentProps) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', lg: '100%' },
        overflow: { xs: 'visible', lg: 'hidden' },
        bgcolor: 'background.paper',
      }}
    >
      {children}
    </Box>
  )
}
