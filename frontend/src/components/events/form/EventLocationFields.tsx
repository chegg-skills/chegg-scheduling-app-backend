import { useState, useEffect, useMemo } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Collapse from '@mui/material/Collapse'
import { FormField } from '@/components/shared/form/FormField'
import { Textarea } from '@/components/shared/form/Textarea'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import { Switch } from '@/components/shared/form/Switch'
import { Video, Link2, MapPin, Sliders } from 'lucide-react'
import type { EventFormValues } from './eventFormSchema'
import type { EventLocationType } from '@/types'

const LOCATION_TYPES: { value: EventLocationType; label: string; description: string; icon: any }[] = [
  { value: 'VIRTUAL', label: 'Virtual (URL)', description: 'Online meeting room (e.g. Zoom, Meet)', icon: Video },
  { value: 'IN_PERSON', label: 'In person', description: 'Physical address or location', icon: MapPin },
  { value: 'CUSTOM', label: 'Custom instruction', description: 'Custom text or instructions', icon: Sliders },
]

const locationHint: Record<EventLocationType, string> = {
  VIRTUAL: 'Enter a fallback URL (e.g. a shared team room). Used when the configured link source is empty.',
  IN_PERSON: 'Enter the physical address where the session will take place.',
  CUSTOM: 'Any custom location details or instructions for the meeting.',
}

/**
 * Handles locationType, locationValue, and meetingLinkSource fields.
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

  const expiresAt = watch('locationLinkExpiresAt')
  const [hasExpiration, setHasExpiration] = useState(() => !!expiresAt)

  useEffect(() => {
    if (expiresAt) {
      setHasExpiration(true)
    }
  }, [expiresAt])

  const minDate = useMemo(() => new Date(), [])

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

  const showLinkExpirationOptions =
    (locationType === 'VIRTUAL' || locationType === 'CUSTOM') &&
    meetingLinkSource === 'EVENT_LOCATION'

  return (
    <Stack spacing={3}>
      <FormField
        label="Location type"
        htmlFor="locationType"
        error={errors.locationType?.message}
        required
      >
        <Select
          id="locationType"
          value={locationType || ''}
          hasError={!!errors.locationType}
          {...register('locationType')}
          inputProps={{ 'aria-label': 'Location type' }}
          renderValue={(value) => {
            const opt = LOCATION_TYPES.find((o) => o.value === value)
            if (!opt) return null
            const Icon = opt.icon
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon size={16} />
                <span>{opt.label}</span>
              </Box>
            )
          }}
        >
          {LOCATION_TYPES.map((opt) => {
            const Icon = opt.icon
            return (
              <MenuItem key={opt.value} value={opt.value} sx={{ py: 1, px: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box sx={{ display: 'flex', color: 'text.secondary', alignItems: 'center' }}>
                    <Icon size={18} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {opt.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
                      {opt.description}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            )
          })}
        </Select>
      </FormField>

      <FormField
        label="Location"
        htmlFor="locationValue"
        error={errors.locationValue?.message}
        hint={locationType ? locationHint[locationType] : undefined}
      >
        <Textarea
          id="locationValue"
          hasError={!!errors.locationValue}
          {...register('locationValue')}
        />
      </FormField>

      {showLinkExpirationOptions && (
        <Stack spacing={2} sx={{ mt: 1 }}>
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
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.toISOString() : null)}
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
      )}

      {(locationType === 'VIRTUAL' || locationType === 'CUSTOM') && (
        <FormControl component="fieldset" fullWidth error={!!errors.meetingLinkSource}>
          <FormLabel
            component="legend"
            sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', mb: 1.5 }}
          >
            Meeting link sent to students
          </FormLabel>
          <Stack spacing={1.5}>
            {[
              {
                value: 'COACH_ISV',
                title: "Assigned coach's Zoom link",
                description: "Each student receives their coach's personal Zoom link. Falls back to the location URL above if the coach has no link set.",
                icon: Video,
                disabled: allowAnonymousBooking,
              },
              {
                value: 'EVENT_LOCATION',
                title: 'Event location URL',
                description: "All students receive the URL entered above. Falls back to the coach's Zoom link if the location URL is empty.",
                icon: Link2,
                disabled: false,
              },
            ].map((opt) => {
              const isSelected = (meetingLinkSource ?? 'COACH_ISV') === opt.value
              const isDisabled = opt.disabled
              const Icon = opt.icon
              return (
                <Box
                  key={opt.value}
                  onClick={() => {
                    if (isDisabled) return
                    setValue('meetingLinkSource', opt.value as 'COACH_ISV' | 'EVENT_LOCATION', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: isDisabled ? 'divider' : (isSelected ? 'primary.main' : 'divider'),
                    boxShadow: !isDisabled && isSelected
                      ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                      : 'none',
                    bgcolor: isDisabled ? 'action.hover' : (isSelected ? '#FFF6F0' : 'background.paper'),
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    opacity: isDisabled ? 0.6 : 1,
                    ...(!isDisabled && {
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: '#FFF6F0',
                      },
                    }),
                  }}
                >
                  <Radio
                    checked={isSelected}
                    disabled={isDisabled}
                    size="small"
                    sx={{ p: 0, mt: 0.25 }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 0.75,
                      borderRadius: 1,
                      bgcolor: isDisabled ? 'action.hover' : (isSelected ? 'primary.lighter' : 'action.hover'),
                      color: isDisabled ? 'text.disabled' : (isSelected ? 'primary.main' : 'text.secondary'),
                      mt: -0.25,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={16} />
                  </Box>
                  <Stack spacing={0.5} sx={{ textAlign: 'left', flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} color={isDisabled ? 'text.disabled' : (isSelected ? 'primary.main' : 'text.primary')}>
                      {opt.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {opt.description}
                    </Typography>
                    {isDisabled && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontWeight: 500 }}>
                        Option unavailable when Anonymous Booking is enabled.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
          {errors.meetingLinkSource?.message && (
            <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
              {errors.meetingLinkSource.message}
            </Typography>
          )}
        </FormControl>
      )}

    </Stack>
  )
}
