import * as React from 'react'
import Box from '@mui/material/Box'

interface PublicBaseLayoutProps {
    children: React.ReactNode
}

/**
 * PublicBaseLayout provides the core 100vh flex container 
 * shared by the booking and rescheduling flows.
 */
export function PublicBaseLayout({ children }: PublicBaseLayoutProps) {
    return (
        <Box
            sx={{
                height: { xs: '100vh', lg: '92vh' },
                display: 'flex',
                overflow: 'hidden',
                bgcolor: 'background.paper'
            }}
        >
            {children}
        </Box>
    )
}
