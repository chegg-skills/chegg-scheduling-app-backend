import { useState } from 'react'
import { Dialog, Box, IconButton, Alert } from '@mui/material'
import { TroubleshootSlotsButton } from '@/components/shared/ui/TroubleshootSlotsButton'
import { X } from 'lucide-react'
import type { Booking } from '@/types'
import { useBookFollowUpSession } from '@/hooks/queries/useBookings'
import { usePublicSessionUser } from '@/hooks/usePublicSessionUser'
import { extractApiError } from '@/utils/apiError'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import { PublicBookingStepper } from '@/components/public/booking/PublicBookingStepper'
import { useFollowUpSlots } from './follow-up/useFollowUpSlots'
import { useFollowUpStudentForm } from './follow-up/useFollowUpStudentForm'
import { FollowUpSidePanel } from './follow-up/FollowUpSidePanel'
import { FollowUpSuccessPanel } from './follow-up/FollowUpSuccessPanel'
import { FollowUpScheduleStep } from './follow-up/FollowUpScheduleStep'
import { FollowUpDetailsStep } from './follow-up/FollowUpDetailsStep'
import { FollowUpFooter } from './follow-up/FollowUpFooter'

interface BookFollowUpDialogProps {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
}

export function BookFollowUpDialog({ isOpen, booking, onClose }: BookFollowUpDialogProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const { isInternalUser } = usePublicSessionUser()

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

  const {
    studentInfo,
    effectiveQuestions,
    handleCustomAnswerChange,
    handleFormChange,
    resetStudentInfo,
  } = useFollowUpStudentForm(isOpen, booking)

  const bookFollowUpSessionMutation = useBookFollowUpSession()

  const {
    maxDate,
    slots,
    isLoadingSlots,
    amSlots,
    pmSlots,
    timeFormat,
    dateFormat,
    formatSlotWithTz,
    availableDates,
    isLoadingDates,
    isFixedSlots,
  } = useFollowUpSlots(booking, selectedDate, selectedTimezone, calendarMonth)

  if (!booking) return null

  const handleNext = () => {
    setErrorMsg(null)
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrorMsg(null)
    setActiveStep((prev) => prev - 1)
  }

  const handleClose = () => {
    if (bookFollowUpSessionMutation.isPending) return
    setActiveStep(0)
    setSelectedDate(new Date())
    setCalendarMonth(new Date())
    setSelectedSlot(null)
    resetStudentInfo()
    setErrorMsg(null)
    setIsConfirmed(false)
    setShowDebug(false)
    onClose()
  }

  const handleBackOrCancel = () => {
    if (activeStep === 0) {
      handleClose()
    } else {
      handleBack()
    }
  }

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return

    setErrorMsg(null)
    bookFollowUpSessionMutation.mutate(
      {
        bookingId: booking.id,
        data: {
          startTime: selectedSlot,
          timezone: selectedTimezone,
          ...studentInfo,
        },
      },
      {
        onSuccess: () => {
          setIsConfirmed(true)
        },
        onError: (err) => {
          setErrorMsg(extractApiError(err))
        },
      }
    )
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          width: showDebug && activeStep === 0 ? 1536 : 1200,
          maxWidth: showDebug && activeStep === 0 ? '95vw' : '90vw',
          height: 750,
          minHeight: 750,
          maxHeight: 750,
          p: 0,
          transition: 'width 0.3s ease-in-out, max-width 0.3s ease-in-out',
        },
      }}
    >
      {isConfirmed ? (
        <FollowUpSuccessPanel
          booking={booking}
          selectedSlot={selectedSlot}
          selectedTimezone={selectedTimezone}
          onClose={handleClose}
          formatSlotWithTz={formatSlotWithTz}
        />
      ) : (
        <Box sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
          {/* Left Side Panel (Persistent Selection Info) */}
          <FollowUpSidePanel
            booking={booking}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            selectedTimezone={selectedTimezone}
          />

          {/* Right Main Content Panel */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              position: 'relative',
              bgcolor: 'background.paper',
            }}
          >
            {/* Absolute Close Button */}
            <IconButton
              onClick={handleClose}
              size="small"
              disabled={bookFollowUpSessionMutation.isPending}
              sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
            >
              <X size={18} />
            </IconButton>

            {/* Step Header matching the public flow */}
            <PublicStepHeader showStepper={false}>
              <PublicBookingStepper
                activeStep={activeStep}
                stepKeys={['schedule', 'confirm']}
                completionStep={2}
              />
            </PublicStepHeader>

            {/* Step Content Scrollable Panel */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: activeStep === 0 ? 0 : { xs: 1.5, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                height: '100%',
              }}
            >
              {errorMsg && (
                <Box sx={{ p: 2 }}>
                  <Alert severity="error" variant="outlined" sx={{ borderRadius: 1.5 }}>
                    {errorMsg}
                  </Alert>
                </Box>
              )}

              {activeStep === 0 && (
                <FollowUpScheduleStep
                  booking={booking}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedSlot={selectedSlot}
                  setSelectedSlot={setSelectedSlot}
                  selectedTimezone={selectedTimezone}
                  setSelectedTimezone={setSelectedTimezone}
                  maxDate={maxDate}
                  isLoadingSlots={isLoadingSlots}
                  slots={slots}
                  amSlots={amSlots}
                  pmSlots={pmSlots}
                  timeFormat={timeFormat}
                  dateFormat={dateFormat}
                  showDebug={showDebug}
                  eventId={booking.event?.id || booking.eventId || undefined}
                  availableDates={availableDates}
                  isLoadingDates={isLoadingDates}
                  isFixedSlots={isFixedSlots}
                  onMonthChange={setCalendarMonth}
                />
              )}

              {activeStep === 1 && (
                <FollowUpDetailsStep
                  booking={booking}
                  studentInfo={studentInfo}
                  effectiveQuestions={effectiveQuestions}
                  handleCustomAnswerChange={handleCustomAnswerChange}
                  handleFormChange={handleFormChange}
                />
              )}
            </Box>

            {/* Dialog Footer Actions aligned right side-by-side */}
            <FollowUpFooter
              activeStep={activeStep}
              isPending={bookFollowUpSessionMutation.isPending}
              primaryDisabled={
                (activeStep === 0 && !selectedSlot) || bookFollowUpSessionMutation.isPending
              }
              onBackOrCancel={handleBackOrCancel}
              onPrimary={activeStep === 1 ? handleConfirmBooking : handleNext}
              extraAccessory={
                activeStep === 0 && isInternalUser && (
                  <TroubleshootSlotsButton show={showDebug} onClick={() => setShowDebug(!showDebug)} />
                )
              }
            />
          </Box>
        </Box>
      )}
    </Dialog>
  )
}
