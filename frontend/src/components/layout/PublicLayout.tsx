import * as React from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import type { Breakpoint } from '@mui/material'
import { ConsentNotice } from '../public/ConsentNotice'

interface PublicLayoutProps {
  maxWidth?: Breakpoint
}

export interface PublicLayoutOutletContext {
  setFramed: (isFramed: boolean) => void
  isEmbed: boolean
}

/**
 * PublicLayout provides a minimal, chromeless layout for embedding the booking wizard in iframes.
 * It omits the sidebar and top navigation to maximize usable space.
 *
 * When ?embed=true is present, the layout strips all visual chrome (padding, border, shadow,
 * consent banner) so the booking page renders flat inside a third-party <iframe>.
 */
export function PublicLayout({ maxWidth = 'md' }: PublicLayoutProps) {
  const [isFramed, setIsFramed] = React.useState(true)
  const [searchParams] = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'

  // Embed mode always renders flat regardless of what child pages request via setFramed
  const effectiveIsFramed = isEmbed ? false : isFramed

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: isEmbed ? 'transparent' : 'background.default',
        py: isEmbed ? 0 : { xs: 0, sm: 4 },
        px: isEmbed ? 0 : { xs: 0, sm: 2 },
      }}
    >
      <Container maxWidth={maxWidth} disableGutters>
        <Box
          sx={{
            bgcolor: effectiveIsFramed ? 'background.paper' : 'transparent',
            borderRadius: { xs: 0, sm: 2 },
            borderWidth: { xs: 0, sm: effectiveIsFramed ? 1 : 0 },
            borderStyle: { xs: 'none', sm: effectiveIsFramed ? 'solid' : 'none' },
            borderColor: effectiveIsFramed ? 'divider' : 'transparent',
            boxShadow: {
              xs: 'none',
              sm: effectiveIsFramed
                ? '0 16px 36px -24px rgb(15 23 42 / 0.42), 0 3px 10px -4px rgb(15 23 42 / 0.2)'
                : 'none',
            },
            overflow: 'hidden',
          }}
        >
          <Outlet context={{ setFramed: setIsFramed, isEmbed }} />
        </Box>
      </Container>
      {!isEmbed && <ConsentNotice />}
    </Box>
  )
}
