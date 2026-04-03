import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import type { InteractionTypeFormValues } from './interactionTypeFormSchema'

interface InteractionTypeCapabilitiesSectionProps {
  control: Control<InteractionTypeFormValues>
  errors: FieldErrors<InteractionTypeFormValues>
}

interface CapabilityCheckboxProps {
  id: string
  info?: string
  label: string
  onChange: (value: boolean) => void
  value: boolean
}

function CapabilityCheckbox({
  id,
  info,
  label,
  onChange,
  value,
}: CapabilityCheckboxProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <FormControlLabel
        control={<Checkbox id={id} checked={value} onChange={(event) => onChange(event.target.checked)} />}
        label={label}
        sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
      />
      {info && <InfoTooltip title={info} />}
    </Stack>
  )
}

export function InteractionTypeCapabilitiesSection({
  control,
  errors,
}: InteractionTypeCapabilitiesSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle2">Capabilities</Typography>

        <Controller
          name="supportsMultipleHosts"
          control={control}
          render={({ field }) => (
            <CapabilityCheckbox
              id="supportsMultipleHosts"
              label="Supports multiple hosts"
              value={field.value ?? false}
              onChange={field.onChange}
              info="Allows multiple hosts to be assigned to the same event booking."
            />
          )}
        />

        <Controller
          name="supportsRoundRobin"
          control={control}
          render={({ field }) => (
            <Box>
              <CapabilityCheckbox
                id="supportsRoundRobin"
                label="Supports round-robin assignment"
                value={field.value ?? false}
                onChange={field.onChange}
                info="Automatically cycles through available hosts to distribute events evenly."
              />
              {errors.supportsRoundRobin ? (
                <Typography variant="caption" color="error">
                  {errors.supportsRoundRobin.message}
                </Typography>
              ) : null}
            </Box>
          )}
        />
      </Stack>
    </Paper>
  )
}
