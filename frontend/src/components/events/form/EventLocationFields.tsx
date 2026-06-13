import { useState, useEffect, useMemo } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import { FormField } from '@/components/shared/form/FormField'
import { Textarea } from '@/components/shared/form/Textarea'
import { Input } from '@/components/shared/form/Input'
import { Switch } from '@/components/shared/form/Switch'
import { Video, Link2, MapPin, Sliders } from 'lucide-react'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles unified event location and joining method configuration with progressive disclosure.
 * Consumes the EventForm context.
 */
export function EventLocationFields() {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  const locationType = watch('locationType')
  const meetingLinkSource = watch('meetingLinkSource')
  const allowAnonymousBooking = watch('allowAnonymousBooking')
  const locationValue = watch('locationValue')
  const expiresAt = watch('locationLinkExpiresAt')

  const [hasExpiration, setHasExpiration] = useState(() => !!expiresAt)

  useEffect(() => {
    if (expiresAt) {
      setHasExpiration(true)
    }
  }, [expiresAt])

  // When anonymous booking is enabled, COACH_ISV is schema-invalid. Auto-correct to EVENT_LOCATION
  // so the filtered-out COACH_ZOOM card doesn't leave the form in an unsubmittable state.
  useEffect(() => {
    if (allowAnonymousBooking && meetingLinkSource === 'COACH_ISV') {
      setValue('meetingLinkSource', 'EVENT_LOCATION', { shouldDirty: true, shouldValidate: true })
    }
  }, [allowAnonymousBooking, meetingLinkSource, setValue])

  const minDate = useMemo(() => new Date(), [])

  // Derive the current join method from backend field states
  const joinMethod = useMemo(() => {
    if (locationType === 'IN_PERSON') return 'IN_PERSON'
    if (locationType === 'CUSTOM') return 'CUSTOM_INSTRUCTIONS'
    if (locationType === 'VIRTUAL') {
      if (meetingLinkSource === 'COACH_ISV') return 'COACH_ZOOM'
      return 'EVENT_LINK'
    }
    return 'COACH_ZOOM'
  }, [locationType, meetingLinkSource])

  const joinMethods = useMemo(() => {
    const methods = [
      {
        value: 'COACH_ZOOM' as const,
        title: "Coach's Zoom Link",
        description: "Each student receives their coach's personal Zoom link. You can optionally set an event-level meeting URL below as a shared fallback, and configure an expiry reminder for it.",
        icon: Video,
      },
      {
        value: 'EVENT_LINK' as const,
        title: "Shared Event Link",
        description: "All students receive the same static meeting URL (e.g. shared Zoom room, Google Meet link). You can optionally configure expiry and reminders for this link.",
        icon: Link2,
      },
      {
        value: 'IN_PERSON' as const,
        title: "In Person",
        description: "Meet face-to-face at a physical address or location.",
        icon: MapPin,
      },
      {
        value: 'CUSTOM_INSTRUCTIONS' as const,
        title: "Custom Instructions",
        description: "Provide text instructions, phone numbers, or custom directions to join the session. Supports optional expiration settings.",
        icon: Sliders,
      },
    ]

    if (allowAnonymousBooking) {
      return methods.filter((m) => m.value !== 'COACH_ZOOM')
    }
    return methods
  }, [allowAnonymousBooking])

  const selectedMethodInfo = useMemo(() => {
    return joinMethods.find((o) => o.value === joinMethod)
  }, [joinMethod, joinMethods])

  const handleJoinMethodChange = (method: 'COACH_ZOOM' | 'EVENT_LINK' | 'IN_PERSON' | 'CUSTOM_INSTRUCTIONS') => {
    if (method === 'COACH_ZOOM') {
      setValue('locationType', 'VIRTUAL', { shouldDirty: true, shouldValidate: true })
      setValue('meetingLinkSource', 'COACH_ISV', { shouldDirty: true, shouldValidate: true })
    } else if (method === 'EVENT_LINK') {
      setValue('locationType', 'VIRTUAL', { shouldDirty: true, shouldValidate: true })
      setValue('meetingLinkSource', 'EVENT_LOCATION', { shouldDirty: true, shouldValidate: true })
    } else if (method === 'IN_PERSON') {
      setValue('locationType', 'IN_PERSON', { shouldDirty: true, shouldValidate: true })
      setValue('meetingLinkSource', 'EVENT_LOCATION', { shouldDirty: true, shouldValidate: true })
    } else if (method === 'CUSTOM_INSTRUCTIONS') {
      setValue('locationType', 'CUSTOM', { shouldDirty: true, shouldValidate: true })
      setValue('meetingLinkSource', 'EVENT_LOCATION', { shouldDirty: true, shouldValidate: true })
    }
  }

  const handleToggleExpiration = (checked: boolean) => {
    setHasExpiration(checked)
    if (!checked) {
      setValue('locationLinkExpiresAt', null, { shouldDirty: true, shouldValidate: true })
      setValue('locationLinkReminderDays', null, { shouldDirty: true, shouldValidate: true })
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      const defaultDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setValue('locationLinkExpiresAt', defaultDateStr, { shouldDirty: true, shouldValidate: true })
      setValue('locationLinkReminderDays', 7, { shouldDirty: true, shouldValidate: true })
    }
  }

  // Expiry is only meaningful when there is actually a URL to expire
  const showLinkExpirationOptions =
    (locationType === 'VIRTUAL' || locationType === 'CUSTOM') && !!locationValue?.trim()

  const renderExpirationSettings = () => {
    if (!showLinkExpirationOptions) return null
    return (
      <Stack spacing={2} sx={{ mt: 1.5 }}>
        <Switch
          label="Set link expiration & reminder"
          checked={hasExpiration}
          onChange={handleToggleExpiration}
        />
        <Collapse in={hasExpiration}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5, mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <FormField
                label="Link Expiry Date"
                htmlFor="locationLinkExpiresAt"
                error={errors.locationLinkExpiresAt?.message}
                required
              >
                <Controller
                  name="locationLinkExpiresAt"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value + 'T12:00:00') : null}
                      onChange={(date) => {
                        if (!date) { field.onChange(null); return }
                        const y = date.getFullYear()
                        const mo = String(date.getMonth() + 1).padStart(2, '0')
                        const d = String(date.getDate()).padStart(2, '0')
                        field.onChange(`${y}-${mo}-${d}`)
                      }}
                      minDate={minDate}
                      slotProps={{
                        textField: {
                          id: 'locationLinkExpiresAt',
                          fullWidth: true,
                          size: 'small',
                          error: !!errors.locationLinkExpiresAt,
                          sx: { '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } },
                        },
                      }}
                    />
                  )}
                />
              </FormField>
            </Box>

            <Box sx={{ flex: 1 }}>
              <FormField
                label="Reminder Days"
                htmlFor="locationLinkReminderDays"
                error={errors.locationLinkReminderDays?.message}
                hint="Days before expiry."
                required
              >
                <Controller
                  name="locationLinkReminderDays"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="locationLinkReminderDays"
                      type="number"
                      placeholder="e.g. 7"
                      disabled={!hasExpiration}
                      inputProps={{ min: 1, max: 90 }}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? null : Number(val))
                      }}
                      hasError={!!errors.locationLinkReminderDays}
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  )}
                />
              </FormField>
            </Box>
          </Stack>
        </Collapse>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <FormControl component="fieldset" fullWidth error={!!errors.locationType || !!errors.meetingLinkSource}>
        <FormLabel
          component="legend"
          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', mb: 1.5 }}
        >
          How should students join this event?
        </FormLabel>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {joinMethods.map((opt) => {
            const isSelected = joinMethod === opt.value
            const Icon = opt.icon
            return (
              <Box
                key={opt.value}
                onClick={() => {
                  handleJoinMethodChange(opt.value)
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  boxShadow: isSelected
                    ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                    : 'none',
                  bgcolor: isSelected ? '#FFF6F0' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 1,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: '#FFF6F0',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 1,
                    borderRadius: '50%',
                    bgcolor: isSelected ? 'primary.lighter' : 'action.hover',
                    color: isSelected ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={20} />
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={isSelected ? 'primary.main' : 'text.primary'}
                  sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}
                >
                  {opt.title}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </FormControl>

      <Box sx={{ mt: 1 }}>
        {/* Progressive Disclosure: Description for the selected join method */}
        {selectedMethodInfo && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 2.5, lineHeight: 1.4 }}
          >
            {selectedMethodInfo.description}
          </Typography>
        )}

        {joinMethod === 'COACH_ZOOM' && (
          <Stack spacing={2}>
            <FormField
              label="Event Link (Fallback) (Optional)"
              htmlFor="locationValue"
              error={errors.locationValue?.message}
              info="This is your event's shared meeting URL. Coaches without a personal Zoom link will use this, and it doubles as the fallback for everyone else."
            >
              <Input
                id="locationValue"
                placeholder="e.g. https://zoom.us/j/shared-room"
                hasError={!!errors.locationValue}
                {...register('locationValue')}
                sx={{ bgcolor: 'background.paper' }}
              />
            </FormField>
            {renderExpirationSettings()}
          </Stack>
        )}

        {joinMethod === 'EVENT_LINK' && (
          <Stack spacing={2}>
            <FormField
              label="Event Link"
              htmlFor="locationValue"
              error={errors.locationValue?.message}
              hint="Enter the shared meeting URL all students should join."
              required
            >
              <Input
                id="locationValue"
                placeholder="e.g. https://zoom.us/j/shared-room"
                hasError={!!errors.locationValue}
                {...register('locationValue')}
                sx={{ bgcolor: 'background.paper' }}
              />
            </FormField>
            {renderExpirationSettings()}
          </Stack>
        )}

        {joinMethod === 'IN_PERSON' && (
          <FormField
            label="In-Person Address"
            htmlFor="locationValue"
            error={errors.locationValue?.message}
            hint="Enter the physical address where the session will take place."
            required
          >
            <Textarea
              id="locationValue"
              placeholder="e.g. 123 Main St, Room 101"
              hasError={!!errors.locationValue}
              {...register('locationValue')}
            />
          </FormField>
        )}

        {joinMethod === 'CUSTOM_INSTRUCTIONS' && (
          <Stack spacing={2}>
            <FormField
              label="Instructions & Details"
              htmlFor="locationValue"
              error={errors.locationValue?.message}
              hint="Enter custom instructions or text directions for joining."
              required
            >
              <Textarea
                id="locationValue"
                placeholder="e.g. Please join the Slack channel #live-session..."
                hasError={!!errors.locationValue}
                {...register('locationValue')}
              />
            </FormField>
            {renderExpirationSettings()}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
