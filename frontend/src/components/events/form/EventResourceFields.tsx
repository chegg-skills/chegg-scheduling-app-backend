import { useFormContext, Controller } from 'react-hook-form'
import {
  Autocomplete,
  createFilterOptions,
  TextField,
  CircularProgress,
  Stack,
  Box,
  Typography,
} from '@mui/material'
import { FormField } from '@/components/shared/form/FormField'
import { toTitleCase } from '@/utils/toTitleCase'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { User, Users, ArrowRight } from 'lucide-react'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionType } from '@/types'

const INTERACTION_DETAILS = {
  ONE_TO_ONE: {
    title: 'One-to-One',
    intendedFor: 'Personal, individual tutoring or mentoring sessions.',
    capabilities: 'Allows students to choose a preferred coach or supports automated lead assignments.',
    autoConfigured: 'Lock to Flexible Booking (based on coach weekly availability).',
    leftIcon: User,
    rightIcon: User,
    definition: '1 Coach, 1 Student per session',
  },
  ONE_TO_MANY: {
    title: 'One-to-Many',
    intendedFor: 'Group workshops, reviews, or webinars led by a single host.',
    capabilities: 'Unlocks participant capacity caps, anonymous booking, and deferred coach reveal settings.',
    autoConfigured: 'Forced to Fixed Session Slots and Direct host assignment.',
    leftIcon: User,
    rightIcon: Users,
    definition: '1 Coach, many Students per session',
  },
  MANY_TO_ONE: {
    title: 'Many-to-One',
    intendedFor: 'Panel reviews, interviews, or collaborative examinations.',
    capabilities: 'Supports assigning a lead coach and multiple co-hosts per session.',
    autoConfigured: 'Supports both Flexible Booking and Fixed Session Slots.',
    leftIcon: Users,
    rightIcon: User,
    definition: 'Many Coaches, 1 Student per session',
  },
  MANY_TO_MANY: {
    title: 'Many-to-Many',
    intendedFor: 'Collaborative team presentations, group projects, or panel workshops.',
    capabilities: 'Supports participant capacity caps along with a lead coach and co-hosts.',
    autoConfigured: 'Forced to Fixed Session Slots.',
    leftIcon: Users,
    rightIcon: Users,
    definition: 'Many Coaches, many Students per session',
  },
} as const

const filter = createFilterOptions<EventTypeOption>()

interface EventTypeOption {
  id?: string
  name: string
  inputValue?: string
}

export function EventResourceFields() {
  const {
    watch,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const { data: allEventTypes = [], isLoading } = useEventTypes()

  const eventTypes = allEventTypes.filter((et) => et.isActive)
  const selectedType = watch('interactionType') as InteractionType | undefined

  return (
    <Stack spacing={2}>
      <FormField
        label="Event type"
        htmlFor="eventTypeId"
        error={errors.eventTypeId?.message}
        info="The type of service for this event (e.g., Tutorial). You can also type to create a new one."
        required
      >
        <Controller
          name="eventTypeId"
          control={control}
          render={({ field }) => (
            <Autocomplete
              value={
                eventTypes.find((et) => et.id === field.value) ||
                (field.value ? { name: field.value } : null)
              }
              onChange={(_event, newValue) => {
                if (typeof newValue === 'string') {
                  field.onChange(newValue)
                } else if (newValue && newValue.inputValue) {
                  field.onChange(newValue.inputValue)
                } else {
                  field.onChange(newValue?.id || '')
                }
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params)

                const { inputValue } = params
                // Suggest the creation of a new value
                const isExisting = options.some((option) => inputValue === option.name)
                if (inputValue !== '' && !isExisting) {
                  filtered.push({
                    inputValue,
                    name: `Add "${inputValue}"`,
                  })
                }

                return filtered
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              id="eventTypeId"
              options={eventTypes as EventTypeOption[]}
              getOptionLabel={(option) => {
                // Value selected with enter, right from the input
                if (typeof option === 'string') {
                  return option
                }
                // Add "xxx" option created dynamically
                if (option.inputValue) {
                  return option.inputValue
                }
                // Regular option
                return toTitleCase(option.name)
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id || option.inputValue}>
                  {option.name}
                </li>
              )}
              sx={{ width: '100%' }}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or type to create…"
                  size="small"
                  error={!!errors.eventTypeId}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                    sx: {
                      borderRadius: 1.5,
                      '& fieldset': {
                        borderColor: 'divider',
                      },
                    },
                  }}
                />
              )}
            />
          )}
        />
      </FormField>

      <FormField
        label="Interaction type"
        htmlFor="interactionType"
        error={errors.interactionType?.message}
        info="Defines the session format: how many coaches and students participate per session."
        required
      >
        <Controller
          name="interactionType"
          control={control}
          render={({ field }) => (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 1.5,
              }}
            >
              {Object.entries(INTERACTION_DETAILS).map(([key, details]) => {
                const isSelected = field.value === key
                return (
                  <Box
                    key={key}
                    onClick={() => field.onChange(key as InteractionType)}
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
                        gap: 0.75,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '16px',
                        bgcolor: isSelected ? 'primary.lighter' : 'action.hover',
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <details.leftIcon size={16} />
                      <ArrowRight size={10} style={{ opacity: 0.5 }} />
                      <details.rightIcon size={16} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={isSelected ? 'primary.main' : 'text.primary'}
                        sx={{ fontSize: '0.8125rem', lineHeight: 1.2 }}
                      >
                        {details.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.6875rem', display: 'block', mt: 0.25, opacity: 0.8 }}
                      >
                        {details.definition.replace(' per session', '')}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        />
      </FormField>

      {selectedType && INTERACTION_DETAILS[selectedType] && (
        <Box
          sx={{
            mt: 1,
            p: 2,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
            About {INTERACTION_DETAILS[selectedType].title}
          </Typography>
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Definition:</strong> {INTERACTION_DETAILS[selectedType].definition}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Intended for:</strong> {INTERACTION_DETAILS[selectedType].intendedFor}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Key Capabilities:</strong> {INTERACTION_DETAILS[selectedType].capabilities}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Auto-configured Behavior:</strong> {INTERACTION_DETAILS[selectedType].autoConfigured}
            </Typography>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
