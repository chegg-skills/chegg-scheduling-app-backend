import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import type { BookingStepKey } from '@/pages/public/hooks/usePublicBookingState'

const stepLabels: Record<BookingStepKey, string> = {
  team: 'Team',
  event: 'Session',
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

  return (
    <Stepper activeStep={activeStep} sx={{ mb: 6 }} alternativeLabel>
      {stepKeys.map((stepKey) => (
        <Step key={stepKey}>
          <StepLabel>{stepLabels[stepKey]}</StepLabel>
        </Step>
      ))}
    </Stepper>
  )
}
