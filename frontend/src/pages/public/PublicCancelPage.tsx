import * as React from 'react'
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
  useOutletContext,
} from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Radio,
} from '@mui/material'
import { publicApi } from '@/api/public'
import { bookingsApi } from '@/api/bookings'
import { extractApiError, getApiStatus } from '@/utils/apiError'
import type { PublicBooking } from '@/types'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import { SuccessView } from '@/components/public/cancel/SuccessView'
import { AlreadyCancelledView } from '@/components/public/cancel/AlreadyCancelledView'
import { InvalidLinkView } from '@/components/public/cancel/InvalidLinkView'

const cancellationOptions = [
  { value: 'conflict', label: 'Schedule conflict / Need to reschedule' },
  { value: 'resolved', label: 'I resolved the issue or found the answer already' },
  { value: 'not_needed', label: 'No longer need coaching for this topic' },
  { value: 'technical', label: 'Technical issues (Wi-Fi, laptop, zoom, etc.)' },
  { value: 'personal', label: 'Personal emergency / Unexpected change' },
  { value: 'other', label: 'Other (please specify below)' },
]

export function PublicCancelPage() {
  const { bookingId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { setFramed } = useOutletContext<PublicLayoutOutletContext>()

  // Capture token once from URL or fall back to sessionStorage so it survives refreshes
  const [token] = React.useState(() => {
    const urlToken = searchParams.get('token')
    const storageKey = `cancel_token_${bookingId}`
    if (urlToken) {
      try {
        sessionStorage.setItem(storageKey, urlToken)
      } catch {
        // sessionStorage unavailable — token stays in memory only
      }
      return urlToken
    }
    try {
      return sessionStorage.getItem(storageKey) || ''
    } catch {
      return ''
    }
  })

  const [selectedOption, setSelectedOption] = React.useState<string | null>(null)
  const [cancellationReason, setCancellationReason] = React.useState('')
  const [isSuccess, setIsSuccess] = React.useState(false)

  React.useEffect(() => {
    setFramed(!isSuccess)
    return () => setFramed(true)
  }, [isSuccess, setFramed])

  // Strip token from URL after capturing — prevents it lingering in browser history
  React.useEffect(() => {
    if (searchParams.get('token')) {
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    data: booking,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['public', 'cancel', bookingId, token],
    queryFn: ({ signal }) =>
      publicApi.getBooking(bookingId, token, { signal }).then((r) => r.data.data?.booking as PublicBooking | undefined),
    enabled: !!bookingId && !!token,
    retry: false,
  })

  const getSubmissionReason = () => {
    if (selectedOption === 'other') {
      return cancellationReason.trim()
    }
    const option = cancellationOptions.find((opt) => opt.value === selectedOption)
    return option ? option.label : ''
  }

  const {
    mutate: confirmCancel,
    isPending: isSubmitting,
    error: cancelError,
  } = useMutation({
    mutationFn: () =>
      bookingsApi.cancel(bookingId, {
        token,
        cancellationReason: getSubmissionReason() || undefined,
      }),
    onSuccess: () => setIsSuccess(true),
  })

  const fetchStatus = getApiStatus(fetchError)
  const cancelStatus = getApiStatus(cancelError)
  const isAlreadyCancelled = fetchStatus === 409 || cancelStatus === 409

  const isConfirmDisabled =
    !selectedOption || (selectedOption === 'other' && !cancellationReason.trim())

  // Loading or token missing
  if (!token) {
    return <InvalidLinkView />
  }

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress />
      </Box>
    )
  }

  // Already cancelled — distinct state
  if (isAlreadyCancelled) {
    return (
      <AlreadyCancelledView
        publicBookingUrl={
          booking?.event?.publicBookingSlug
            ? `/book/event/${booking.event.publicBookingSlug}`
            : undefined
        }
      />
    )
  }

  // Expired or invalid link
  if (fetchError && !booking) {
    return <InvalidLinkView />
  }

  // Success screen
  if (isSuccess) {
    return (
      <SuccessView
        booking={booking}
        publicBookingUrl={
          booking?.event?.publicBookingSlug
            ? `/book/event/${booking.event.publicBookingSlug}`
            : undefined
        }
      />
    )
  }

  // Confirmation layout
  return (
    <PublicBaseLayout>
      {/* Column 1: Information & Current Session Details */}
      <PublicSidePanel>
        <PublicBookingHeader
          scope="event"
          customHeading="Cancel your session"
          customSubtitle="Please review details of your booking below before confirming."
          eventDetails={booking?.event}
          coachDetails={booking?.coach}
        />

        <PublicBookingSummary
          title="Current session details"
          variant="current"
          eventDetails={booking?.event}
          coachDetails={booking?.coach}
          selectedDate={booking ? new Date(booking.startTime) : null}
          selectedSlot={booking?.startTime || null}
          selectedTimezone={booking?.timezone || 'UTC'}
        />
      </PublicSidePanel>

      {/* Column 2: Content Area */}
      <PublicMainContent>
        <PublicStepHeader showStepper={false}>
          {/* Mobile Header */}
          <PublicMobileHeader
            scope="event"
            customHeading="Cancel your session"
            customSubtitle="Please review details of your booking below before confirming."
            eventDetails={booking?.event}
            coachDetails={booking?.coach}
            selectedDate={booking ? new Date(booking.startTime) : null}
            selectedSlot={booking?.startTime || null}
            currentBookingDetails={
              booking
                ? {
                    eventDetails: booking.event,
                    coachDetails: booking.coach,
                    date: new Date(booking.startTime),
                    slot: booking.startTime,
                  }
                : undefined
            }
          />
        </PublicStepHeader>

        {/* Main Content Area - Options directly in page */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 3, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3.5,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Cancellation Reason
            </Typography>
            <Typography
              variant="h6"
              fontWeight={800}
              color="text.primary"
              mb={1}
              sx={{ letterSpacing: '-0.3px' }}
            >
              Please choose your preferred cancellation reason
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              We're sorry to see you cancel. Please let us know why you need to cancel this session
              so we can improve our service.
            </Typography>
          </Box>

          {/* Predefined options list in two columns */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            {cancellationOptions.map((opt) => {
              const isSelected = selectedOption === opt.value
              return (
                <Box
                  key={opt.value}
                  onClick={() => setSelectedOption(opt.value)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: 1.5,
                    border: '1.5px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected
                      ? (theme) => alpha(theme.palette.primary.main, 0.03)
                      : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    boxSizing: 'border-box',
                    '&:hover': {
                      borderColor: isSelected ? 'primary.main' : 'text.secondary',
                      bgcolor: isSelected
                        ? (theme) => alpha(theme.palette.primary.main, 0.05)
                        : (theme) => alpha(theme.palette.secondary.main, 0.01),
                    },
                  }}
                >
                  <Radio
                    checked={isSelected}
                    onChange={() => setSelectedOption(opt.value)}
                    value={opt.value}
                    name="cancellation-reason-radio"
                    sx={{
                      p: 0,
                      mr: 2,
                      color: 'divider',
                      '&.Mui-checked': {
                        color: 'primary.main',
                      },
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={isSelected ? 600 : 500}
                    color="text.primary"
                  >
                    {opt.label}
                  </Typography>
                </Box>
              )
            })}
          </Box>

          {/* Custom specify reason input */}
          {selectedOption === 'other' && (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Please specify your reason"
                placeholder="Type your cancellation reason here..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                inputProps={{ maxLength: 500 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    backgroundColor: 'background.paper',
                  },
                }}
              />
            </Box>
          )}

          {cancelError && !isAlreadyCancelled && (
            <Typography variant="body2" color="error" fontWeight={500}>
              {extractApiError(cancelError)}
            </Typography>
          )}
        </Box>

        {/* Footer Area */}
        <Box
          sx={{
            py: 2,
            px: { xs: 2, md: 4 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Left Action: Keep Booking and Return */}
          <Button
            variant="text"
            disabled={isSubmitting}
            onClick={() =>
              navigate(
                booking?.event?.publicBookingSlug
                  ? `/book/event/${booking.event.publicBookingSlug}`
                  : '/'
              )
            }
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: '0.9rem',
              '&:hover': {
                color: 'primary.main',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            Keep Booking and Return
          </Button>

          {/* Right Action: Confirm cancellation */}
          <Button
            variant="contained"
            color="error"
            disabled={isConfirmDisabled || isSubmitting}
            onClick={() => confirmCancel()}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              px: 4,
              py: 1.25,
              minWidth: 200,
              fontWeight: 800,
              borderRadius: 3,
              backgroundColor: 'error.main',
              boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.error.main, 0.3)}`,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'error.dark',
                boxShadow: (theme) => `0 12px 20px -4px ${alpha(theme.palette.error.main, 0.4)}`,
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
          </Button>
        </Box>
      </PublicMainContent>
    </PublicBaseLayout>
  )
}

