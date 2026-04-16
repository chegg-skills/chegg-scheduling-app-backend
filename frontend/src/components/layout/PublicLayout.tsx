import * as React from 'react'
import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import type { Breakpoint } from '@mui/material'

interface PublicLayoutProps {
  maxWidth?: Breakpoint
}

export interface PublicLayoutOutletContext {
  setFramed: (isFramed: boolean) => void
}

/**
 * PublicLayout provides a minimal, chromeless layout for embedding the booking wizard in iframes.
 * It omits the sidebar and top navigation to maximize usable space.
 */
export function PublicLayout({ maxWidth = 'md' }: PublicLayoutProps) {
  const [isFramed, setIsFramed] = React.useState(true)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Container maxWidth={maxWidth} disableGutters>
        <Box
          sx={{
            bgcolor: isFramed ? 'background.paper' : 'transparent',
            borderRadius: 2,
            border: isFramed ? '1px solid' : 'none',
            borderColor: isFramed ? 'divider' : 'transparent',
            boxShadow: isFramed
              ? '0 16px 36px -24px rgb(15 23 42 / 0.42), 0 3px 10px -4px rgb(15 23 42 / 0.2)'
              : 'none',
            overflow: 'hidden',
          }}
        >
          <Outlet context={{ setFramed: setIsFramed }} />
        </Box>
      </Container>
    </Box>
  )
}
