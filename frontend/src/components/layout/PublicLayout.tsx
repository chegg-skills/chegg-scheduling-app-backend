import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import type { Breakpoint } from '@mui/material'

interface PublicLayoutProps {
    maxWidth?: Breakpoint
}

/**
 * PublicLayout provides a minimal, chromeless layout for embedding the booking wizard in iframes.
 * It omits the sidebar and top navigation to maximize usable space.
 */
export function PublicLayout({ maxWidth = 'md' }: PublicLayoutProps) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                py: { xs: 2, sm: 4 },
                px: { xs: 1, sm: 2 }
            }}
        >
            <Container maxWidth={maxWidth} disableGutters>
                <Box
                    sx={{
                        bgcolor: 'background.paper',
                        borderRadius: { xs: 0, sm: 2 },
                        boxShadow: { xs: 0, sm: 1 },
                        overflow: 'hidden'
                    }}
                >
                    <Outlet />
                </Box>
            </Container>
        </Box>
    )
}
