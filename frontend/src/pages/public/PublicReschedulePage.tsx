import * as React from 'react'
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
  useOutletContext,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { startOfDayInTimezone } from '@/utils/dateTimezone'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

import { publicApi } from '@/api/public'
import { bookingsApi } from '@/api/bookings'
import { extractApiError } from '@/utils/apiError'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { SuccessStep } from '@/components/public/booking/SuccessStep'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { PublicTimezoneSelect } from '@/components/public/booking/PublicTimezoneSelect'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'
import { PublicNavigationFooter } from '@/components/public/layout/PublicNavigationFooter'
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import { TroubleshootDialog } from '@/components/public/booking/TroubleshootDialog'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

export function PublicReschedulePage() {
  const { bookingId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Capture token once from initial URL or fallback to sessionStorage so it survives refreshes
  const [token] = React.useState(() => {
    const urlToken = searchParams.get('token')
    const storageKey = `reschedule_token_${bookingId}`
    if (urlToken) {
      try {
        sessionStorage.setItem(storageKey, urlToken)
      } catch (e) {
        console.warn('Failed to save reschedule token to sessionStorage', e)
      }
      return urlToken
    }
    try {
      return sessionStorage.getItem(storageKey) || ''
    } catch {
      return ''
    }
  })

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [selectedTimezone, setSelectedTimezone] = React.useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null)
  const [troubleshootOpen, setTroubleshootOpen] = React.useState(false)
  const { setFramed } = useOutletContext<PublicLayoutOutletContext>()

  React.useEffect(() => {
    setFramed(!isSuccess)
    return () => setFramed(true)
  }, [isSuccess, setFramed])

  // Strip token from URL after capturing it — prevents it lingering in browser history
  React.useEffect(() => {
    if (searchParams.get('token')) {
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 1. Fetch Booking Details
  const {
    data: bookingData,
    isLoading: isLoadingBooking,
    error: bookingError,
  } = useQuery({
    queryKey: ['public', 'booking', bookingId, token],
    queryFn: ({ signal }) =>
      publicApi.getBooking(bookingId, token, signal).then((r) => r.data.data?.booking),
    enabled: !!bookingId && !!token,
    retry: false,
  })

  // 2. Fetch Slots for the Event
  const { startDate, endDate } = React.useMemo(
    () => ({
      startDate: startOfDayInTimezone(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTimezone
      ).toISOString(),
      endDate: new Date(
        startOfDayInTimezone(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate() + 1,
          selectedTimezone
        ).getTime() - 1
      ).toISOString(),
    }),
    [selectedDate, selectedTimezone]
  )

  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['public', 'slots', bookingData?.eventId, startDate, endDate],
    queryFn: ({ signal }) =>
      publicApi
        .getAvailableSlots(bookingData?.eventId || '', startDate, endDate, undefined, signal)
        .then((r) => r.data.data?.slots),
    enabled: !!bookingData?.eventId,
  })

  const slots = slotsData || []

  const handleReschedule = async () => {
    if (!selectedSlot) return

    setRescheduleError(null)
    setIsSubmitting(true)
    try {
      await bookingsApi.reschedule(bookingId, {
        startTime: selectedSlot,
        timezone: selectedTimezone,
        token,
      })
      setIsSuccess(true)
    } catch (error) {
      setRescheduleError(extractApiError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingBooking) return <PageSpinner />

  if (bookingError || !bookingData) {
    const errorMessage = bookingError
      ? extractApiError(bookingError)
      : !token
        ? 'Reschedule token is missing from the link.'
        : 'Booking not found or link has expired.'
    return (
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <ErrorAlert message={errorMessage} />
        <Button onClick={() => navigate('/')} variant="outlined" sx={{ mt: 2 }}>
          Back to homepage
        </Button>
      </Box>
    )
  }

  if (isSuccess) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SuccessStep
          email={bookingData.studentEmail}
          mode="reschedule"
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
                  const tzName = new Intl.DateTimeFormat('en-US', {
                    timeZone: selectedTimezone,
                    timeZoneName: 'long',
                  })
                    .formatToParts(dateObj)
                    .find((p) => p.type === 'timeZoneName')?.value || ''
                  return tzName ? `${timeStr} (${tzName})` : timeStr
                })()
              : ''
          }
          eventName={bookingData.event?.name || ''}
          mentorName={
            bookingData.coach ? `${bookingData.coach.firstName} ${bookingData.coach.lastName}` : ''
          }
          selectedTimezone={selectedTimezone}
          onReset={() => navigate('/')}
        />
      </LocalizationProvider>
    )
  }

  const currentBookingInfo = {
    teamDetails: (bookingData.event as any)?.team,
    eventDetails: bookingData.event as any,
    coachDetails: bookingData.coach as any,
    date: new Date(bookingData.startTime),
    slot: bookingData.startTime,
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <PublicBaseLayout>
        {/* Column 1: Information & Current Session Details */}
        <PublicSidePanel>
          <PublicBookingHeader
            scope="event"
            customHeading="Reschedule your current session"
            customSubtitle="Select a new time below to update your booking."
            eventDetails={bookingData.event as any}
            coachDetails={bookingData.coach as any}
          />

          <PublicBookingSummary
            title="Current session"
            variant="current"
            {...currentBookingInfo}
            selectedDate={currentBookingInfo.date}
            selectedSlot={currentBookingInfo.slot}
            selectedTimezone={selectedTimezone}
          />

          <PublicBookingSummary
            title="New selection"
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            selectedTimezone={selectedTimezone}
          />
        </PublicSidePanel>

        {/* Column 2: Content Area */}
        <PublicMainContent>
          <PublicStepHeader showStepper={false}>
            {/* Mobile Header */}
            <PublicMobileHeader
              scope="event"
              customHeading="Reschedule your current session"
              eventDetails={bookingData.event as any}
              coachDetails={bookingData.coach as any}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              currentBookingDetails={currentBookingInfo}
            />
          </PublicStepHeader>

          {/* Main Step Content */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              p: 0,
              minHeight: 0,
            }}
          >
            <SlotStep
              slots={slots}
              loading={isLoadingSlots}
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date)
                setSelectedSlot(null)
              }}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              selectedTimezone={selectedTimezone}
              setSelectedTimezone={setSelectedTimezone}
            />
          </Box>

          {rescheduleError && (
            <Box sx={{ px: 2, pb: 1 }}>
              <ErrorAlert message={rescheduleError} />
            </Box>
          )}
          <PublicNavigationFooter
            showBack={false}
            onNext={handleReschedule}
            nextLabel="Reschedule"
            submittingLabel="Rescheduling..."
            nextDisabled={!selectedSlot}
            isSubmitting={isSubmitting}
            onTroubleshoot={() => setTroubleshootOpen(true)}
            extraAccessory={
              <PublicTimezoneSelect
                value={selectedTimezone}
                onChange={setSelectedTimezone}
              />
            }
          />
        </PublicMainContent>
      </PublicBaseLayout>
      <TroubleshootDialog open={troubleshootOpen} onClose={() => setTroubleshootOpen(false)} />
    </LocalizationProvider>
  )
}
