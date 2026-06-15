import { useState, useEffect } from 'react'
import { FormProvider } from 'react-hook-form'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventBasicFields } from './EventBasicFields'
import { EventLocationFields } from './EventLocationFields'
import { EventScheduleFields } from './EventScheduleFields'
import { EventSchedulingPolicyFields } from './EventSchedulingPolicyFields'
import { EventResourceFields } from './EventResourceFields'
import { EventAssignmentAlert } from '../EventAssignmentAlert'
import { EventFormSubmitActions } from './EventFormSubmitActions'
import { useEventForm } from './hooks/useEventForm'
import { useTeamMembers } from '@/hooks/queries/useTeamMembers'
import { extractApiError } from '@/utils/apiError'
import { EventCustomQuestionsFields } from './EventCustomQuestionsFields'
import type { Event } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventFormProps {
  teamId: string
  event?: Event
  accessedFromEventsTab?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Main form component for creating or editing Events.
 * Utilizes FormProvider to share form state with child field components,
 * eliminating prop-drilling of register, errors, and control.
 */
const NAVIGATION_ITEMS = [
  { id: 'section-basic-info', label: 'Basic info' },
  { id: 'section-resources', label: 'Resources' },
  { id: 'section-booking-rules', label: 'Booking rules' },
  { id: 'section-location', label: 'Location' },
  { id: 'section-schedule', label: 'Schedule & host' },
  { id: 'section-custom-questions', label: 'Questions' },
]

export function EventForm({
  teamId,
  event,
  accessedFromEventsTab = false,
  onSuccess,
  onCancel,
}: EventFormProps) {
  const {
    form,
    onSubmit,
    isPending,
    error,
    caps,
    selectedAssignmentStrategy,
    bookingModeSelection,
    requiredCoachCount,
    isEdit,
  } = useEventForm({ teamId, event, accessedFromEventsTab, onSuccess })

  const watchedTeamId = form.watch('teamId')
  const effectiveTeamId = (accessedFromEventsTab && !isEdit) ? (watchedTeamId || '') : (teamId || '')

  const { data: teamMembersData } = useTeamMembers(effectiveTeamId)
  const teamMembers = teamMembersData?.members ?? []

  const {
    formState: { errors, submitCount },
  } = form
  const hasValidationErrors = Object.keys(errors).length > 0

  const [activeSection, setActiveSection] = useState('section-basic-info')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -50% 0px',
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    NAVIGATION_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleScroll = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <FormProvider {...form}>
        <Box
          component="form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            alignItems: 'flex-start',
          }}
        >
          {/* Left Column: Sticky Sidebar Navigation */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 180,
              flexShrink: 0,
              position: 'sticky',
              top: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Stack spacing={0.5}>
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <Box
                    key={item.id}
                    onClick={() => handleScroll(item.id)}
                    sx={{
                      py: 1,
                      px: 2,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      bgcolor: isActive ? 'primary.lighter' : 'transparent',
                      color: isActive ? 'primary.main' : 'text.secondary',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: isActive ? 'primary.lighter' : 'action.hover',
                        color: isActive ? 'primary.main' : 'text.primary',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: isActive ? 'primary.main' : 'transparent',
                        transition: 'all 0.2s ease',
                      }}
                    />
                    {item.label}
                  </Box>
                )
              })}
            </Stack>
          </Box>

          {/* Right Column: Scrollable Content sections */}
          <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            {error && <ErrorAlert message={extractApiError(error)} />}
            {hasValidationErrors && submitCount > 0 && (
              <ErrorAlert message="Form validation failed. Please check the fields below for errors." />
            )}

            {/* Basic info Section */}
            <Box
              id="section-basic-info"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-basic-info' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Basic info
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Configure name, description, and group details.
              </Typography>
              <EventBasicFields
                teamId={effectiveTeamId}
                showTeamSelect={accessedFromEventsTab && !isEdit}
              />
            </Box>

            {/* Resources Section */}
            <Box
              id="section-resources"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-resources' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Resources
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Define interaction types and session mapping.
              </Typography>
              <EventResourceFields />
            </Box>

            {/* Booking rules & policy Section */}
            <Box
              id="section-booking-rules"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-booking-rules' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Booking rules & policy
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Define limits, windows, and coach reveal strategies.
              </Typography>
              <EventSchedulingPolicyFields
                caps={caps}
                isLocked={(event?._count?.bookings ?? 0) > 0}
              />
            </Box>

            {/* Location Section */}
            <Box
              id="section-location"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-location' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Location
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Set custom links, addresses, or coach Zoom overrides.
              </Typography>
              <EventLocationFields />
            </Box>

            {/* Schedule & assignment Section */}
            <Box
              id="section-schedule"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-schedule' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Schedule & assignment
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Select session duration, assign hosts, and choose strategy.
              </Typography>
              <EventScheduleFields caps={caps} event={event} teamMembers={teamMembers} />
            </Box>

            {/* Custom Questions Section */}
            <Box
              id="section-custom-questions"
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                scrollMarginTop: '24px',
                bgcolor: 'transparent',
              }}
            >
              <Typography variant="overline" color={activeSection === 'section-custom-questions' ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                Questions
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', lineHeight: 1.3 }}>
                Customize the registration questions for this event.
              </Typography>
              <EventCustomQuestionsFields />
            </Box>

            <EventAssignmentAlert
              caps={caps}
              requiredCoachCount={requiredCoachCount}
              selectedAssignmentStrategy={selectedAssignmentStrategy}
              bookingModeSelection={bookingModeSelection}
            />

            <Divider sx={{ my: 1 }} />

            <EventFormSubmitActions
              isPending={isPending}
              isEdit={isEdit}
              onCancel={onCancel}
              defaultActive={event?.isActive ?? true}
            />
          </Stack>
        </Box>
      </FormProvider>
    </Box>
  )
}
