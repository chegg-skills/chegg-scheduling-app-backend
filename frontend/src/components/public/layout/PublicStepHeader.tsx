import * as React from 'react'
import Box from '@mui/material/Box'
import { PublicBookingStepper } from '@/components/public/booking/PublicBookingStepper'

interface PublicStepHeaderProps {
    activeStep: number
    stepKeys: string[]
    completionStep: number
    children?: React.ReactNode
}

/**
 * PublicStepHeader encapsulates the top sticky/flexible bar of the content area.
 */
export function PublicStepHeader({
    activeStep,
    stepKeys,
    completionStep,
    children
}: PublicStepHeaderProps) {
    return (
        <Box
            sx={{
                py: { xs: 1.5, md: 3 },
                px: { xs: 2, md: 2 },
                flexShrink: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
            }}
        >
            {children}
            <PublicBookingStepper
                activeStep={activeStep}
                stepKeys={stepKeys as any}
                completionStep={completionStep}
            />
        </Box>
    )
}
