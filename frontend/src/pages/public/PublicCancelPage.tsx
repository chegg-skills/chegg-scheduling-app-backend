import * as React from 'react'
import { useParams, useSearchParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Divider,
  Stack,
  Radio,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import {
  XCircle,
  AlertTriangle,
  Check,
} from 'lucide-react'

import { publicApi } from '@/api/public'
import { bookingsApi } from '@/api/bookings'
import { extractApiError, getApiStatus } from '@/utils/apiError'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader'
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader'
import LogoOrange from '@/assets/Color=Orange.svg'

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
      publicApi
        .getBooking(bookingId, token, signal)
        .then((r) => r.data.data?.booking),
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

  const { mutate: confirmCancel, isPending: isSubmitting, error: cancelError } = useMutation({
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
    !selectedOption ||
    (selectedOption === 'other' && !cancellationReason.trim())

  // Loading or token missing
  if (!token) {
    return <InvalidLinkView />
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
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
          eventDetails={booking?.event as any}
          coachDetails={booking?.coach as any}
        />

        <PublicBookingSummary
          title="Current session details"
          variant="current"
          eventDetails={booking?.event as any}
          coachDetails={booking?.coach as any}
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
            eventDetails={booking?.event as any}
            coachDetails={booking?.coach as any}
            selectedDate={booking ? new Date(booking.startTime) : null}
            selectedSlot={booking?.startTime || null}
            currentBookingDetails={
              booking
                ? {
                    eventDetails: booking.event as any,
                    coachDetails: booking.coach as any,
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
            <Typography variant="h6" fontWeight={800} color="text.primary" mb={1} sx={{ letterSpacing: '-0.3px' }}>
              Please choose your preferred cancellation reason
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              We're sorry to see you cancel. Please let us know why you need to cancel this session so we can improve our service.
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
                    bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    boxSizing: 'border-box',
                    '&:hover': {
                      borderColor: isSelected ? 'primary.main' : 'text.secondary',
                      bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, 0.05) : (theme) => alpha(theme.palette.secondary.main, 0.01),
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
                  <Typography variant="body2" fontWeight={isSelected ? 600 : 500} color="text.primary">
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
            onClick={() => navigate(booking?.event?.publicBookingSlug ? `/book/event/${booking.event.publicBookingSlug}` : '/')}
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
              }
            }}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
          </Button>
        </Box>
      </PublicMainContent>
    </PublicBaseLayout>
  )
}

function SuccessView({ booking, publicBookingUrl }: { booking?: any; publicBookingUrl?: string }) {
  const navigate = useNavigate()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          borderRadius: 2,
          border: '1.5px solid',
          borderColor: 'success.main',
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ width: 140, height: 'auto', mb: 4 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Check size={28} strokeWidth={3} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            color: 'text.primary',
            mb: 1.5,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Session cancelled
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontWeight: 500, lineHeight: 1.6 }}>
          Your session has been successfully cancelled. A confirmation email has been sent to your inbox.
        </Typography>

        {booking && (
          <Box
            sx={{
              p: 2.5,
              mb: 4,
              bgcolor: 'accent.peach',
              borderRadius: 1.5,
              textAlign: 'left',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                mb: 1.5,
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Cancelled Session Details
            </Typography>

            <Stack spacing={1}>
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                  {booking.event?.name || 'Session'}
                </Typography>
                {booking.startTime && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
                    {new Intl.DateTimeFormat('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(booking.startTime))}
                  </Typography>
                )}
                {booking.startTime && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: booking.timezone || 'UTC',
                    }).format(new Date(booking.startTime))} ({booking.timezone || 'UTC'})
                  </Typography>
                )}
              </Box>

              {booking.coach && (
                <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
                  Coach: {booking.coach.firstName} {booking.coach.lastName}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          onClick={() => navigate(publicBookingUrl || '/')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 800,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          Book another session
        </Button>
      </Paper>
    </Box>
  )
}

function AlreadyCancelledView({ publicBookingUrl }: { publicBookingUrl?: string }) {
  const navigate = useNavigate()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          borderRadius: 2,
          border: '1.5px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ width: 140, height: 'auto', mb: 4 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <XCircle size={28} strokeWidth={2.5} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            color: 'text.primary',
            mb: 1.5,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Already cancelled
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
          Your session has already been cancelled. No further action is needed.
        </Typography>

        <Button
          variant="outlined"
          onClick={() => navigate(publicBookingUrl || '/')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 700,
            borderRadius: 1.5,
            textTransform: 'none',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': {
              color: 'primary.main',
              borderColor: 'primary.main',
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          Book another session
        </Button>
      </Paper>
    </Box>
  )
}

function InvalidLinkView() {
  const navigate = useNavigate()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          borderRadius: 2,
          border: '1.5px solid',
          borderColor: 'error.main',
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ width: 140, height: 'auto', mb: 4 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.main',
            }}
          >
            <AlertTriangle size={28} strokeWidth={2.5} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            color: 'text.primary',
            mb: 1.5,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Link no longer valid
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
          This cancellation link is no longer valid or has expired. The session may have already started, or the link has been used.
        </Typography>

        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 800,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          Back to homepage
        </Button>
      </Paper>
    </Box>
  )
}
