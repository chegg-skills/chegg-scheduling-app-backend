import { useFormContext, Controller } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { toTitleCase } from '@/utils/toTitleCase'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { INTERACTION_TYPE_OPTIONS } from '@/constants/interactionTypes'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionType } from '@/types'

export function EventResourceFields() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const { data: allEventTypes = [] } = useEventTypes()

  const eventTypes = allEventTypes.filter((et) => et.isActive)
  const selectedType = watch('interactionType') as InteractionType | undefined

  return (
    <Stack spacing={2}>
      <FormField
        label="Event type"
        htmlFor="eventTypeId"
        error={errors.eventTypeId?.message}
        info="The type of service for this event (e.g., Tutorial)."
        required
      >
        <Select
          id="eventTypeId"
          hasError={!!errors.eventTypeId}
          value={watch('eventTypeId') || ''}
          {...register('eventTypeId')}
        >
          <MenuItem value="">Select an event type…</MenuItem>
          {eventTypes.map((et) => (
            <MenuItem key={et.id} value={et.id}>
              {toTitleCase(et.name)}
            </MenuItem>
          ))}
        </Select>
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
                    variant="outlined"
                    sx={{
                      borderRadius: 1.5,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: isSelected ? '#FFF6F0' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
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
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, lineHeight: 1.3 }}
                          >
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
