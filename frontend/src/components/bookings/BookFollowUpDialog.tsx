import React, { useState, useMemo } from 'react'
import {
  Dialog,
  Typography,
  Stack,
  Box,
  TextField,
  Divider,
  IconButton,
  Alert,
  Paper,
  Button,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { X, CalendarPlus } from 'lucide-react'
import type { Booking, PublicEventSummary } from '@/types'
import { usePublicSlots } from '@/hooks/queries/usePublicBooking'
import { useBookFollowUpSession } from '@/hooks/queries/useBookings'
import { startOfDayInTimezone } from '@/utils/dateTimezone'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import type { InteractionType } from '@/constants/interactionTypes'
import { PublicTimezoneSelect } from '@/components/public/booking/PublicTimezoneSelect'
import { SlotGroup } from '@/components/public/booking/SlotGroup'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { toTitleCase } from '@/utils/toTitleCase'
import { extractApiError } from '@/utils/apiError'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import { PublicBookingStepper } from '@/components/public/booking/PublicBookingStepper'
import { SuccessStep } from '@/components/public/booking/SuccessStep'

interface BookFollowUpDialogProps {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
}

const MAX_CHARS = 500

export function BookFollowUpDialog({ isOpen, booking, onClose }: BookFollowUpDialogProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const [studentInfo, setStudentInfo] = useState({
    notes: '',
    specificQuestion: '',
    triedSolutions: '',
    usedResources: '',
    sessionObjectives: '',
  })

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const bookFollowUpSessionMutation = useBookFollowUpSession()

  // Max selectable date based on event's booking window, anchored to the student's timezone
  const maxDate = useMemo(() => {
    const days = booking?.event?.maxBookingWindowDays
    if (!days) return undefined
    const today = new Date()
    return startOfDayInTimezone(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + days,
      selectedTimezone
    )
  }, [booking?.event?.maxBookingWindowDays, selectedTimezone])

  // 1. Calculate startDate & endDate for slots query based on selectedDate & selectedTimezone
  const { startStr, endStr } = useMemo(() => {
    if (!booking) return { startStr: '', endStr: '' }
    return {
      startStr: startOfDayInTimezone(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTimezone
      ).toISOString(),
      endStr: new Date(
        startOfDayInTimezone(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate() + 1,
          selectedTimezone
        ).getTime() - 1
      ).toISOString(),
    }
  }, [selectedDate, selectedTimezone, booking])

  // 2. Fetch slots for event filtered by original coach
  const { data: slots = [], isLoading: isLoadingSlots } = usePublicSlots(
    booking?.eventId || '',
    startStr,
    endStr,
    booking?.coachUserId || undefined,
    selectedTimezone
  )

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    [selectedTimezone]
  )

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  )

  const hourExtractor = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        hourCycle: 'h23',
      }),
    [selectedTimezone]
  )

  const { amSlots, pmSlots } = useMemo(() => {
    const am: any[] = []
    const pm: any[] = []

    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    sorted.forEach((s) => {
      const date = new Date(s.startTime)
      const hourStr = hourExtractor.format(date)
      const hour = parseInt(hourStr, 10)

      if (hour < 12) {
        am.push(s)
      } else {
        pm.push(s)
      }
    })

    return { amSlots: am, pmSlots: pm }
  }, [slots, hourExtractor])

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
    setSelectedSlot(null)
    setStudentInfo({
      notes: '',
      specificQuestion: '',
      triedSolutions: '',
      usedResources: '',
      sessionObjectives: '',
    })
    setErrorMsg(null)
    setIsConfirmed(false)
    onClose()
  }

  const handleFormChange =
    (field: keyof typeof studentInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setStudentInfo({ ...studentInfo, [field]: e.target.value })
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
          width: 1200,
          maxWidth: '90vw',
          height: 750,
          minHeight: 750,
          maxHeight: 750,
          p: 0,
        },
      }}
    >
      {isConfirmed ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            bgcolor: 'background.paper',
            p: 3,
            position: 'relative',
          }}
        >
          {/* Absolute Close Button */}
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
          >
            <X size={18} />
          </IconButton>

          <SuccessStep
            email={booking.studentEmail}
            onReset={handleClose}
            mode="booking"
            eventName={booking.event?.name}
            newDate={selectedSlot ? new Date(selectedSlot) : null}
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
            mentorName={booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : ''}
            selectedTimezone={selectedTimezone}
            buttonLabel="Return to Bookings"
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
          {/* Left Side Panel (Persistent Selection Info) */}
        <Box
          sx={{
            width: 380, // Matched width of PublicSidePanel
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: (theme) => alpha(theme.palette.secondary.main, 0.08),
            p: 0, // Padding set to 0 to prevent top/left spacing around the header
            height: '100%',
            overflow: 'hidden', // Set overflow to hidden to prevent scrollbar track offsets
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.02),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Content matching public booking header typography with brand background and calendar icon */}
          <Box
            sx={{
              height: 140, // Match height of PublicStepHeader exactly
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              px: 3,
              bgcolor: (theme) => theme.palette.primary.light,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5, color: 'text.primary' }}>
              <CalendarPlus size={22} style={{ flexShrink: 0 }} />
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, lineHeight: 1.1 }}>
                Book Follow-Up
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, fontWeight: 500, lineHeight: 1.4 }}
            >
              Schedule a new session for {toTitleCase(booking.studentName)}.
            </Typography>
          </Box>

          {/* Selection summary wrapped in standard padding with local scroll wrapper */}
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexGrow: 1 }}>
            <PublicBookingSummary
              teamDetails={booking.team}
              eventDetails={booking.event as unknown as PublicEventSummary}
              coachDetails={booking.coach}
              selectedDate={selectedSlot ? new Date(selectedSlot) : selectedDate}
              selectedSlot={selectedSlot}
              selectedTimezone={selectedTimezone}
              compact
            />
          </Box>
        </Box>

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

            {/* STEP 1: SELECT DATE & TIME */}
            {activeStep === 0 && (
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                alignItems="stretch"
                sx={{ height: '100%', minHeight: 0 }}
                divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />}
              >
                {/* Calendar Picker Column */}
                <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0, p: { xs: 2, lg: 3 } }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                      sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
                    >
                      1. Select date
                    </Typography>
                  </Box>
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={selectedDate}
                      onChange={(newValue) => {
                        if (newValue) {
                          setSelectedDate(newValue)
                          setSelectedSlot(null)
                        }
                      }}
                      minDate={new Date()}
                      maxDate={maxDate}
                      slotProps={{
                        actionBar: { actions: [] },
                      }}
                      sx={{
                        '.MuiDateCalendar-root': { width: '100%', maxWidth: 'none' },
                      }}
                    />
                  </Paper>
                  <Box sx={{ mt: 1.5, width: '100%' }}>
                    <PublicTimezoneSelect value={selectedTimezone} onChange={setSelectedTimezone} />
                  </Box>
                </Box>

                {/* Slots List Column */}
                <Box
                  sx={{
                    flexGrow: 1,
                    p: { xs: 2, lg: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                      sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}
                    >
                      {(() => {
                        const caps = booking.event?.interactionType
                          ? INTERACTION_TYPE_CAPS[booking.event.interactionType as InteractionType]
                          : null
                        if (caps?.multipleParticipants) {
                          return '2. Available Group Slots'
                        }
                        return `2. Available Slots (${booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : 'Coach'})`
                      })()}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="text.primary">
                      {dateFormat.format(selectedDate)}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />

                  {/* Scrollable area for slots */}
                  <Box
                    sx={{
                      overflowY: { xs: 'visible', lg: 'auto' },
                      flexGrow: 1,
                      pr: 1,
                      mt: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
                    }}
                  >
                    {isLoadingSlots ? (
                      <PageSpinner />
                    ) : slots.length === 0 ? (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary" variant="body2">
                          {booking.event?.bookingMode === 'FIXED_SLOTS'
                            ? 'No pre-created slots for this date. Create new slots in the event’s Schedule tab first.'
                            : 'No availability for the coach on this date.'}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ pb: 2 }}>
                        <SlotGroup
                          title="Morning"
                          slots={amSlots}
                          selectedSlot={selectedSlot}
                          onSelect={setSelectedSlot}
                          timeFormat={timeFormat}
                        />
                        <SlotGroup
                          title="Afternoon & Evening"
                          slots={pmSlots}
                          selectedSlot={selectedSlot}
                          onSelect={setSelectedSlot}
                          timeFormat={timeFormat}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Stack>
            )}

            {/* STEP 2: SESSION DETAILS FORM */}
            {activeStep === 1 && (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    fontWeight={800}
                    sx={{ display: 'block', mb: 1, letterSpacing: 1.2, fontSize: '0.7rem' }}
                  >
                    Registration
                  </Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, letterSpacing: -0.5 }}>
                    Your information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Please provide details to finalize the booking.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    pt: 1,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
                  }}
                >
                  <Stack spacing={2} sx={{ pb: 2, px: 0.5, maxWidth: 800 }}>

                    {/* Student Info is read-only for follow-up sessions */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <TextField
                        label="Full name"
                        fullWidth
                        disabled
                        size="small"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                          '& .MuiInputBase-input': { py: 1.25 },
                        }}
                        value={toTitleCase(booking.studentName)}
                      />
                      <TextField
                        label="Email address"
                        fullWidth
                        disabled
                        size="small"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                          '& .MuiInputBase-input': { py: 1.25 },
                        }}
                        type="email"
                        value={booking.studentEmail}
                      />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
                      <TextField
                        label="Specific question or problem?"
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
                        value={studentInfo.specificQuestion}
                        onChange={handleFormChange('specificQuestion')}
                        placeholder="e.g., I'm having trouble with the calculus chain rule..."
                        inputProps={{ maxLength: MAX_CHARS }}
                        helperText={
                          studentInfo.specificQuestion.length >= MAX_CHARS
                            ? `Maximum character limit of ${MAX_CHARS} reached`
                            : `${studentInfo.specificQuestion.length} / ${MAX_CHARS}`
                        }
                        FormHelperTextProps={{
                          sx: {
                            textAlign: 'right',
                            color: studentInfo.specificQuestion.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                            fontWeight: studentInfo.specificQuestion.length >= MAX_CHARS ? 600 : 400,
                          }
                        }}
                        error={studentInfo.specificQuestion.length >= MAX_CHARS}
                      />
                      <TextField
                        label="What has student tried since last session?"
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
                        value={studentInfo.triedSolutions}
                        onChange={handleFormChange('triedSolutions')}
                        placeholder="e.g., Attempted the textbook problems..."
                        inputProps={{ maxLength: MAX_CHARS }}
                        helperText={
                          studentInfo.triedSolutions.length >= MAX_CHARS
                            ? `Maximum character limit of ${MAX_CHARS} reached`
                            : `${studentInfo.triedSolutions.length} / ${MAX_CHARS}`
                        }
                        FormHelperTextProps={{
                          sx: {
                            textAlign: 'right',
                            color: studentInfo.triedSolutions.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                            fontWeight: studentInfo.triedSolutions.length >= MAX_CHARS ? 600 : 400,
                          }
                        }}
                        error={studentInfo.triedSolutions.length >= MAX_CHARS}
                      />
                      <TextField
                        label="Resources used so far?"
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
                        value={studentInfo.usedResources}
                        onChange={handleFormChange('usedResources')}
                        placeholder="e.g. Textbook chapter 4..."
                        inputProps={{ maxLength: MAX_CHARS }}
                        helperText={
                          studentInfo.usedResources.length >= MAX_CHARS
                            ? `Maximum character limit of ${MAX_CHARS} reached`
                            : `${studentInfo.usedResources.length} / ${MAX_CHARS}`
                        }
                        FormHelperTextProps={{
                          sx: {
                            textAlign: 'right',
                            color: studentInfo.usedResources.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                            fontWeight: studentInfo.usedResources.length >= MAX_CHARS ? 600 : 400,
                          }
                        }}
                        error={studentInfo.usedResources.length >= MAX_CHARS}
                      />
                      <TextField
                        label="Session objectives"
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
                        value={studentInfo.sessionObjectives}
                        onChange={handleFormChange('sessionObjectives')}
                        placeholder="e.g., master related rates word problems..."
                        inputProps={{ maxLength: MAX_CHARS }}
                        helperText={
                          studentInfo.sessionObjectives.length >= MAX_CHARS
                            ? `Maximum character limit of ${MAX_CHARS} reached`
                            : `${studentInfo.sessionObjectives.length} / ${MAX_CHARS}`
                        }
                        FormHelperTextProps={{
                          sx: {
                            textAlign: 'right',
                            color: studentInfo.sessionObjectives.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                            fontWeight: studentInfo.sessionObjectives.length >= MAX_CHARS ? 600 : 400,
                          }
                        }}
                        error={studentInfo.sessionObjectives.length >= MAX_CHARS}
                      />
                    </Box>

                    <TextField
                      label="Internal Notes / Follow-up Details"
                      fullWidth
                      multiline
                      rows={2}
                      variant="outlined"
                      value={studentInfo.notes}
                      onChange={handleFormChange('notes')}
                      placeholder="Additional notes for the coach..."
                      inputProps={{ maxLength: MAX_CHARS }}
                      helperText={
                        studentInfo.notes.length >= MAX_CHARS
                          ? `Maximum character limit of ${MAX_CHARS} reached`
                          : `${studentInfo.notes.length} / ${MAX_CHARS}`
                      }
                      FormHelperTextProps={{
                        sx: {
                          textAlign: 'right',
                          color: studentInfo.notes.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                          fontWeight: studentInfo.notes.length >= MAX_CHARS ? 600 : 400,
                        }
                      }}
                      error={studentInfo.notes.length >= MAX_CHARS}
                    />
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>

          {/* Dialog Footer Actions aligned right side-by-side */}
          <Box
            sx={{
              py: 2,
              px: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0,
            }}
          >
            <Button
              onClick={handleBackOrCancel}
              disabled={bookFollowUpSessionMutation.isPending}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                color: 'text.secondary',
                px: 3,
                py: 1.25,
                borderRadius: 3,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {activeStep === 0 ? 'Cancel' : 'Back'}
            </Button>

            <Button
              variant="contained"
              size="large"
              disabled={
                (activeStep === 0 && !selectedSlot) ||
                bookFollowUpSessionMutation.isPending
              }
              onClick={activeStep === 1 ? handleConfirmBooking : handleNext}
              sx={{
                px: activeStep === 1 ? 4 : 6,
                py: 1.25,
                minWidth: activeStep === 1 ? 220 : 140,
                fontWeight: 800,
                borderRadius: 3,
                bgcolor: 'primary.main',
                boxShadow: (theme) => `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
                textTransform: 'none',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: (theme) => `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
                },
              }}
            >
              {bookFollowUpSessionMutation.isPending
                ? 'Confirming...'
                : activeStep === 1
                ? 'Confirm booking'
                : 'Next'}
            </Button>
        </Box>
      </Box>
    </Box>
  )}
</Dialog>
  )
}
