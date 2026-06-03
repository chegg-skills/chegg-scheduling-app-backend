import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import type { BookingStepKey } from '@/pages/public/hooks/usePublicBookingState'

const stepLabels: Record<BookingStepKey, string> = {
  team: 'Team',
  event: 'Session',
  'preferred-coach': 'Preferred Coach',
  schedule: 'Schedule',
  confirm: 'Confirm',
}

interface PublicBookingStepperProps {
  activeStep: number
  stepKeys: BookingStepKey[]
  completionStep: number
}

export function PublicBookingStepper({
  activeStep,
  stepKeys,
  completionStep,
}: PublicBookingStepperProps) {
  if (activeStep >= completionStep) return null

  const currentStepKey = stepKeys[activeStep]
  const currentStepLabel = currentStepKey ? stepLabels[currentStepKey] : ''
  const progressPercent = (activeStep / completionStep) * 100

  return (
    <Box sx={{ width: '100%', mt: { xs: 1, md: 0 } }}>
      {/* Desktop Stepper */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Stepper activeStep={activeStep} sx={{ mb: 0 }} alternativeLabel>
          {stepKeys.map((stepKey) => (
            <Step key={stepKey}>
              <StepLabel>{stepLabels[stepKey]}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Mobile Stepper */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, px: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Step {activeStep + 1} of {completionStep}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {currentStepLabel}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: 'primary.main',
            },
          }}
        />
      </Box>
    </Box>
  )
}
