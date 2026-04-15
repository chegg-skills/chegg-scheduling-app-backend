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
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 16px 36px -24px rgb(15 23 42 / 0.42), 0 3px 10px -4px rgb(15 23 42 / 0.2)',
                        overflow: 'hidden'
                    }}
                >
                    <Outlet />
                </Box>
            </Container>
        </Box>
    )
}
