import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Calendar } from 'lucide-react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { TeamStep } from '@/components/public/booking/TeamStep'
import { EventStep } from '@/components/public/booking/EventStep'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { ConfirmationForm } from '@/components/public/booking/ConfirmationForm'
import { SuccessStep } from '@/components/public/booking/SuccessStep'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingStepper } from '@/components/public/booking/PublicBookingStepper'
import { usePublicBookingState } from './hooks/usePublicBookingState'

export function PublicBookingPage() {
  const {
    scope,
    activeStep,
    stepKeys,
    currentStepKey,
    completionStep,
    selectedTeam,
    selectedEvent,
    selectedDate,
    selectedSlot,
    isSubmitting,
    studentInfo,
    setStudentInfo,
    setSelectedDate,
    setSelectedSlot,
    teams,
    loadingTeams,
    teamsError,
    visibleEvents,
    eventsLoading,
    eventsError,
    slots,
    loadingSlots,
    handleNext,
    handleBack,
    handleTeamSelect,
    handleEventSelect,
    handleBook,
    teamDetails,
    eventDetails,
    coachDetails,
    eventDetailsError,
  } = usePublicBookingState()

  const renderStepContent = () => {
    switch (currentStepKey) {
      case 'team':
        return (
          <TeamStep
            teams={teams}
            loading={loadingTeams}
            error={teamsError}
            selectedTeamId={selectedTeam}
            onSelect={handleTeamSelect}
          />
        )
      case 'event':
        return (
          <EventStep
            events={visibleEvents}
            loading={eventsLoading}
            error={eventsError}
            emptyMessage={
              scope === 'coach'
                ? 'This coach does not currently have any public events.'
                : 'No events are available for this booking link.'
            }
            selectedEventId={selectedEvent}
            onSelect={handleEventSelect}
          />
        )
      case 'schedule':
        if (scope === 'event' && eventsLoading) {
          return <Typography color="text.secondary">Loading event details...</Typography>
        }

        if (scope === 'event' && eventDetailsError) {
          return <ErrorAlert message="This public event link is invalid or no longer available." />
        }

        if (!selectedEvent) {
          return <ErrorAlert message="Please select an event before choosing a time slot." />
        }

        return (
          <SlotStep
            slots={slots}
            loading={loadingSlots}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            onNext={handleNext}
          />
        )
      case 'confirm':
        return (
          <ConfirmationForm
            studentInfo={studentInfo}
            isSubmitting={isSubmitting}
            onUpdate={setStudentInfo}
            onBack={handleBack}
            onConfirm={handleBook}
          />
        )
      default:
        return (
          <SuccessStep email={studentInfo.email} onReset={() => window.location.reload()} />
        )
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <PublicBookingHeader
          scope={scope}
          teamDetails={teamDetails}
          eventDetails={eventDetails}
          coachDetails={coachDetails}
        />

        <PublicBookingStepper
          activeStep={activeStep}
          stepKeys={stepKeys}
          completionStep={completionStep}
        />

        {renderStepContent()}

        {activeStep > 0 && activeStep < completionStep - 1 && (
          <Box sx={{ mt: 4 }}>
            <Button onClick={handleBack} startIcon={<Calendar size={18} />}>
              Back to previous step
            </Button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}
