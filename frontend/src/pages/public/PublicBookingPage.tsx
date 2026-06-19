import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import { TroubleshootDialog } from '@/components/public/booking/TroubleshootDialog'

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'
import { PublicNavigationFooter } from '@/components/public/layout/PublicNavigationFooter'
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

import { PageSpinner } from '@/components/shared/ui/Spinner'

import { usePublicBookingState } from './hooks/usePublicBookingState'
import { usePublicSessionUser } from '@/hooks/usePublicSessionUser'

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
    selectedSlotCoach,
    eventDetailsError,
    isFixedSlots,
    availableDates,
    isLoadingDates,
    handleMonthChange,
    selectedCoachId,
    handleCoachSelect,
    showCoachPicker,
    selectedTimezone,
    setSelectedTimezone,
  } = usePublicBookingState()

  const eventCoaches = showCoachPicker ? (eventDetails?.coaches ?? []) : []

  const { isInternalUser } = usePublicSessionUser()

  const { setFramed, isEmbed, setExpandedLayout } = useOutletContext<PublicLayoutOutletContext>()
  const isSuccess = currentStepKey === null || activeStep >= completionStep

  const [bookError, setBookError] = useState<string | null>(null)
  const [troubleshootOpen, setTroubleshootOpen] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

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

  useEffect(() => {
    if (setExpandedLayout) {
      setExpandedLayout(showDebug && currentStepKey === 'schedule' && isInternalUser)
    }
    return () => setExpandedLayout?.(false)
  }, [showDebug, currentStepKey, isInternalUser, setExpandedLayout])

  // Show a full-page loading spinner while loading event details in direct event booking scope
  if (scope === 'event' && !eventDetails && !eventDetailsError) {
    return <PageSpinner />
  }

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
              ? (() => {
                  const dateObj = new Date(selectedSlot)
                  const timeStr = new Intl.DateTimeFormat('en-US', {
                    timeZone: selectedTimezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }).format(dateObj)
                  const tzName =
                    new Intl.DateTimeFormat('en-US', {
                      timeZone: selectedTimezone,
                      timeZoneName: 'long',
                    })
                      .formatToParts(dateObj)
                      .find((p) => p.type === 'timeZoneName')?.value || ''
                  return tzName ? `${timeStr} (${tzName})` : timeStr
                })()
              : ''
          }
          mentorName={coachDetails ? `${coachDetails.firstName} ${coachDetails.lastName}` : ''}
          selectedTimezone={selectedTimezone}
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
            coachDetails={
              selectedSlotCoach ||
              (selectedCoachId && eventCoaches.find((c) => c.coachUserId === selectedCoachId)?.coachUser) ||
              coachDetails
            }
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            selectedTimezone={selectedTimezone}
            compact
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
          <Box
            sx={{
              flexGrow: 1,
              overflowY: { xs: 'visible', lg: currentStepKey === 'schedule' ? 'hidden' : 'auto' },
              display: 'flex',
              flexDirection: 'column',
              p: currentStepKey === 'schedule' ? 0 : { xs: 1.5, sm: 2 },
              minHeight: 0,
            }}
          >            <PublicBookingFlow
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
              maxBookingWindowDays={eventDetails?.maxBookingWindowDays}
              isFixedSlots={isFixedSlots}
              availableDates={availableDates}
              isLoadingDates={isLoadingDates}
              onMonthChange={handleMonthChange}
              eventCoaches={eventCoaches}
              selectedCoachId={selectedCoachId}
              onCoachSelect={handleCoachSelect}
              selectedTimezone={selectedTimezone}
              setSelectedTimezone={setSelectedTimezone}
              eventName={eventDetails?.name}
              eventDetails={eventDetails}
              showDebug={showDebug}
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
              (currentStepKey === 'preferred-coach' && !selectedCoachId) ||
              (currentStepKey === 'schedule' && (!selectedSlot || (showCoachPicker && !selectedCoachId))) ||
              (currentStepKey === 'confirm' && (!studentInfo.name || !studentInfo.email))
            }
            isSubmitting={isSubmitting}
            nextLabel={currentStepKey === 'confirm' ? 'Confirm booking' : 'Next'}
            submittingLabel={currentStepKey === 'confirm' ? 'Confirming...' : 'Next'}
            onTroubleshoot={isEmbed ? undefined : () => setTroubleshootOpen(true)}
            extraAccessory={
              isInternalUser && currentStepKey === 'schedule' && (
                <Button
                  onClick={() => setShowDebug(!showDebug)}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.5,
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  }}
                >
                  {showDebug ? 'Hide Debug' : 'Troubleshoot Slots'}
                </Button>
              )
            }
          />
        </PublicMainContent>
      </PublicBaseLayout>

      <TroubleshootDialog
        open={troubleshootOpen}
        onClose={() => setTroubleshootOpen(false)}
        isAdminViewer={isInternalUser}
        eventId={eventDetails?.id ?? selectedEvent ?? undefined}
        selectedTimezone={selectedTimezone}
        currentDate={toDateInputValue(selectedDate)}
      />
    </LocalizationProvider>
  )
}
