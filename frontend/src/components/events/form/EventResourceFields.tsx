import { useFormContext, Controller } from 'react-hook-form'
import {
  Autocomplete,
  createFilterOptions,
  TextField,
  CircularProgress,
  Stack,
  Box,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from '@mui/material'
import { FormField } from '@/components/shared/form/FormField'
import { toTitleCase } from '@/utils/toTitleCase'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { INTERACTION_TYPE_OPTIONS } from '@/constants/interactionTypes'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionType } from '@/types'

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
              id="event-type-autocomplete"
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
            <RadioGroup
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value as InteractionType)}
              sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}
            >
              {INTERACTION_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedType === option.key
                return (
                  <Paper
                    key={option.key}
                    sx={{
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      boxShadow: isSelected
                        ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                        : 'none',
                      bgcolor: isSelected ? '#FFF6F0' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: '#FFF6F0',
                      },
                    }}
                  >
                    <FormControlLabel
                      value={option.key}
                      control={<Radio size="small" sx={{ p: 0.75 }} />}
                      label={
                        <Box sx={{ py: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {option.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', lineHeight: 1.4 }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, p: 1.25, width: '100%', alignItems: 'flex-start' }}
                    />
                  </Paper>
                )
              })}
            </RadioGroup>
          )}
        />
      </FormField>
    </Stack>
  )
}
