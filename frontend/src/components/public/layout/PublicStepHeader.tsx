import * as React from 'react'
import Box from '@mui/material/Box'
import { PublicBookingStepper } from '@/components/public/booking/PublicBookingStepper'
import { PUBLIC_MAIN_HEADER_MIN_HEIGHT } from './layoutConstants'

interface PublicStepHeaderProps {
    activeStep?: number
    stepKeys?: string[]
    completionStep?: number
    showStepper?: boolean
    children?: React.ReactNode
}

/**
 * PublicStepHeader encapsulates the top sticky/flexible bar of the content area.
 */
export function PublicStepHeader({
    activeStep = 0,
    stepKeys = [],
    completionStep = 0,
    showStepper = true,
    children
}: PublicStepHeaderProps) {
    return (
        <Box
            sx={{
                minHeight: PUBLIC_MAIN_HEADER_MIN_HEIGHT,
                height: { lg: PUBLIC_MAIN_HEADER_MIN_HEIGHT },
                boxSizing: 'border-box',
                py: { xs: 1.5, md: 2, lg: 0 },
                px: { xs: 2, md: 2 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
            }}
        >
            {children}
            {showStepper && stepKeys.length > 0 && (
                <PublicBookingStepper
                    activeStep={activeStep}
                    stepKeys={stepKeys as any}
                    completionStep={completionStep}
                />
            )}
        </Box>
    )
}
