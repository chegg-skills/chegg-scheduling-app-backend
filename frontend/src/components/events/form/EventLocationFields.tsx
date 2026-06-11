import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { Textarea } from '@/components/shared/form/Textarea'
import { Video, Link2 } from 'lucide-react'
import type { EventFormValues } from './eventFormSchema'
import type { EventLocationType } from '@/types'

const LOCATION_TYPES: { value: EventLocationType; label: string }[] = [
  { value: 'VIRTUAL', label: 'Virtual (URL)' },
  { value: 'IN_PERSON', label: 'In person (address)' },
  { value: 'CUSTOM', label: 'Custom' },
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
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const locationType = watch('locationType')
  const meetingLinkSource = watch('meetingLinkSource')

  return (
    <Stack spacing={2}>
      <FormField
        label="Location type"
        htmlFor="locationType"
        error={errors.locationType?.message}
        info="The format of the meeting (Virtual link, Physical address, etc.)."
        required
      >
        <Select
          id="locationType"
          hasError={!!errors.locationType}
          value={locationType || ''}
          inputProps={{ 'aria-label': 'Location type' }}
          {...register('locationType')}
        >
          {LOCATION_TYPES.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
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

      {(locationType === 'VIRTUAL' || locationType === 'CUSTOM') && (
        <FormControl component="fieldset" fullWidth>
          <FormLabel
            component="legend"
            sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', mb: 1 }}
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
              },
              {
                value: 'EVENT_LOCATION',
                title: 'Event location URL',
                description: "All students receive the URL entered above. Falls back to the coach's Zoom link if the location URL is empty.",
                icon: Link2,
              },
            ].map((opt) => {
              const isSelected = (meetingLinkSource ?? 'COACH_ISV') === opt.value
              const Icon = opt.icon
              return (
                <Box
                  key={opt.value}
                  onClick={() =>
                    setValue('meetingLinkSource', opt.value as 'COACH_ISV' | 'EVENT_LOCATION', {
                      shouldDirty: true,
                    })
                  }
                  sx={{
                    p: 2,
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
                    alignItems: 'flex-start',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: '#FFF6F0',
                    },
                  }}
                >
                  <Radio
                    checked={isSelected}
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
                      bgcolor: isSelected ? 'primary.lighter' : 'action.hover',
                      color: isSelected ? 'primary.main' : 'text.secondary',
                      mt: -0.25,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={16} />
                  </Box>
                  <Stack spacing={0.5} sx={{ textAlign: 'left', flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} color={isSelected ? 'primary.main' : 'text.primary'}>
                      {opt.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {opt.description}
                    </Typography>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </FormControl>
      )}
    </Stack>
  )
}
