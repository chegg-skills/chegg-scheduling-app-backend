import Box from '@mui/material/Box'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'

import { SuccessStep } from '@/components/public/booking/SuccessStep'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import { PublicBookingFlow } from '@/components/public/booking/PublicBookingFlow'
import { SessionIntroduction } from '@/components/public/booking/SessionIntroduction'

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'
import { PublicNavigationFooter } from '@/components/public/layout/PublicNavigationFooter'
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

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

  const { setFramed } = useOutletContext<PublicLayoutOutletContext>()
  const isSuccess = currentStepKey === null || activeStep >= completionStep
  const [bookError, setBookError] = useState<string | null>(null)

  const handleBookWithError = async () => {
    setBookError(null)
    try {
      await handleBook()
    } catch (error) {
      setBookError(extractApiError(error))
    }
  }

  useEffect(() => {
    setFramed(!isSuccess)
    return () => setFramed(true)
  }, [isSuccess, setFramed])

  // Handle successful booking (no layout needed)
  if (isSuccess) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SuccessStep
          email={studentInfo.email}
          eventName={eventDetails?.name}
          newDate={selectedDate}
          newTime={
            selectedSlot
              ? new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }).format(new Date(selectedSlot))
              : ''
          }
          mentorName={coachDetails ? `${coachDetails.firstName} ${coachDetails.lastName}` : ''}
          onReset={() => window.location.reload()}
        />
      </LocalizationProvider>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <PublicBaseLayout>
        {/* Column 1: Persistent Info & Branding */}
        <PublicSidePanel>
          <PublicBookingHeader
            scope={scope}
            teamDetails={teamDetails}
            eventDetails={eventDetails}
            coachDetails={coachDetails}
          />

          <PublicBookingSummary
            teamDetails={teamDetails}
            eventDetails={eventDetails}
            coachDetails={coachDetails}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
          />

          {eventDetails?.description && eventDetails?.showDescription && (
            <>
              <SessionIntroduction description={eventDetails.description} />
            </>
          )}
        </PublicSidePanel>

        {/* Column 2: Dynamic Content & Navigation */}
        <PublicMainContent>
          <PublicStepHeader
            activeStep={activeStep}
            stepKeys={stepKeys}
            completionStep={completionStep}
          >
            <PublicMobileHeader
              scope={scope}
              teamDetails={teamDetails}
              eventDetails={eventDetails}
              coachDetails={coachDetails}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
            />
          </PublicStepHeader>

          {/* Main Content Area */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: currentStepKey === 'schedule' ? 0 : 2 }}>
            <PublicBookingFlow
              currentStepKey={currentStepKey}
              scope={scope}
              teams={teams}
              loadingTeams={loadingTeams}
              teamsError={teamsError}
              selectedTeam={selectedTeam}
              handleTeamSelect={handleTeamSelect}
              visibleEvents={visibleEvents}
              eventsLoading={eventsLoading}
              eventsError={eventsError}
              selectedEvent={selectedEvent}
              handleEventSelect={handleEventSelect}
              eventDetailsError={eventDetailsError}
              slots={slots}
              loadingSlots={loadingSlots}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              studentInfo={studentInfo}
              setStudentInfo={setStudentInfo}
            />
          </Box>

          {bookError && (
            <Box sx={{ px: 2, pb: 1 }}>
              <ErrorAlert message={bookError} />
            </Box>
          )}
          <PublicNavigationFooter
            onBack={handleBack}
            onNext={currentStepKey === 'confirm' ? handleBookWithError : handleNext}
            backDisabled={activeStep === 0}
            nextDisabled={
              (currentStepKey === 'team' && !selectedTeam) ||
              (currentStepKey === 'event' && !selectedEvent) ||
              (currentStepKey === 'schedule' && !selectedSlot) ||
              (currentStepKey === 'confirm' && (!studentInfo.name || !studentInfo.email))
            }
            isSubmitting={isSubmitting}
            nextLabel={currentStepKey === 'confirm' ? 'Confirm booking' : 'Next'}
            submittingLabel={currentStepKey === 'confirm' ? 'Confirming...' : 'Next'}
          />
        </PublicMainContent>
      </PublicBaseLayout>
    </LocalizationProvider>
  )
}
