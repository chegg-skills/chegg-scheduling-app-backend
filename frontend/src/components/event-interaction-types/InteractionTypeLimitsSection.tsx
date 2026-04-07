import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import type { InteractionTypeFormValues } from './interactionTypeFormSchema'

interface InteractionTypeLimitsSectionProps {
  control: Control<InteractionTypeFormValues>
  errors: FieldErrors<InteractionTypeFormValues>
  register: UseFormRegister<InteractionTypeFormValues>
  supportsMultipleHosts: boolean
}

export function InteractionTypeLimitsSection({
  control,
  errors,
  register,
  supportsMultipleHosts,
}: InteractionTypeLimitsSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">Capacity rules</Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          <FormField
            label="Min Assigned Coaches"
            htmlFor="minHosts"
            error={errors.minHosts?.message}
            hint={!supportsMultipleHosts ? 'Single-coach types are locked to 1.' : 'Minimum number of coaches that must be assigned to an event.'}
          >
            <Input id="minHosts" type="number" min="1" disabled={!supportsMultipleHosts} {...register('minHosts')} />
          </FormField>

          <FormField
            label="Max Assigned Coaches (blank = unlimited)"
            htmlFor="maxHosts"
            error={errors.maxHosts?.message}
            hint={!supportsMultipleHosts ? 'Single-coach types are locked to 1.' : 'No limit if left blank.'}
          >
            <Controller
              name="maxHosts"
              control={control}
              render={({ field }) => (
                <Input
                  id="maxHosts"
                  type="number"
                  min="1"
                  placeholder={supportsMultipleHosts ? '∞' : '1'}
                  disabled={!supportsMultipleHosts}
                  value={field.value === null || typeof field.value === 'undefined' ? '' : field.value}
                  onChange={(event) => {
                    const { value } = event.target
                    field.onChange(value === '' ? null : Number(value))
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>

          <FormField
            label="Min Participants"
            htmlFor="minParticipants"
            error={errors.minParticipants?.message}
          >
            <Input id="minParticipants" type="number" min="1" {...register('minParticipants')} />
          </FormField>

          <FormField
            label="Max Participants (blank = unlimited)"
            htmlFor="maxParticipants"
            error={errors.maxParticipants?.message}
          >
            <Input
              id="maxParticipants"
              type="number"
              min="1"
              placeholder="∞"
              {...register('maxParticipants', {
                setValueAs: (value) =>
                  typeof value === 'string' && value.trim() === '' ? null : Number(value),
              })}
            />
          </FormField>
        </Box>
      </Stack>
    </Paper>
  )
}
