import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useCreateInteractionType, useUpdateInteractionType } from '@/hooks/useInteractionTypes'
import { extractApiError } from '@/utils/apiError'
import type { EventInteractionType } from '@/types'

const schema = z
  .object({
    key: z.string().min(1, 'Key is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    supportsMultipleHosts: z.boolean().optional(),
    supportsRoundRobin: z.boolean().optional(),
    minHosts: z.coerce.number().int().min(1).optional(),
    maxHosts: z.coerce.number().int().min(1).nullable().optional(),
    minParticipants: z.coerce.number().int().min(1).optional(),
    maxParticipants: z.coerce.number().int().min(1).nullable().optional(),
    sortOrder: z.coerce.number().nonnegative().optional(),
  })
  .refine(
    (d) => !d.supportsRoundRobin || d.supportsMultipleHosts,
    { message: 'Round Robin requires Multiple Hosts to be enabled', path: ['supportsRoundRobin'] },
  )

type FormValues = z.infer<typeof schema>

interface InteractionTypeFormProps {
  interactionType?: EventInteractionType
  onSuccess?: () => void
}

import { InfoTooltip } from '@/components/shared/InfoTooltip'

function CheckboxField({
  id,
  label,
  value,
  onChange,
  info,
}: {
  id: string
  label: string
  value: boolean
  onChange: (v: boolean) => void
  info?: string
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <FormControlLabel
        control={<Checkbox id={id} checked={value} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
        sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
      />
      {info && <InfoTooltip title={info} />}
    </Stack>
  )
}

export function InteractionTypeForm({ interactionType, onSuccess }: InteractionTypeFormProps) {
  const isEdit = !!interactionType
  const { mutate: create, isPending: creating, error: createError } = useCreateInteractionType()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateInteractionType()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: interactionType?.key ?? '',
      name: interactionType?.name ?? '',
      description: interactionType?.description ?? '',
      supportsMultipleHosts: interactionType?.supportsMultipleHosts ?? false,
      supportsRoundRobin: interactionType?.supportsRoundRobin ?? false,
      minHosts: interactionType?.minHosts ?? 1,
      maxHosts: interactionType?.maxHosts ?? null,
      minParticipants: interactionType?.minParticipants ?? 1,
      maxParticipants: interactionType?.maxParticipants ?? null,
      sortOrder: interactionType?.sortOrder ?? 0,
    },
  })

  useEffect(() => {
    if (interactionType) {
      reset({
        key: interactionType.key,
        name: interactionType.name,
        description: interactionType.description ?? '',
        supportsMultipleHosts: interactionType.supportsMultipleHosts,
        supportsRoundRobin: interactionType.supportsRoundRobin,
        minHosts: interactionType.minHosts,
        maxHosts: interactionType.maxHosts,
        minParticipants: interactionType.minParticipants,
        maxParticipants: interactionType.maxParticipants,
        sortOrder: interactionType.sortOrder,
      })
    }
  }, [interactionType, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && interactionType) {
      update({ interactionTypeId: interactionType.id, data: values }, { onSuccess })
    } else {
      create(values, { onSuccess: () => { reset(); onSuccess?.() } })
    }
  }

  const isPending = creating || updating
  const error = createError ?? updateError

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <FormField
          label="Key"
          htmlFor="key"
          error={errors.key?.message}
          info="Unique identifier used for URL paths and internal references."
          hint="Unique snake_case identifier."
          required
        >
          <Input id="key" disabled={isEdit} hasError={!!errors.key} {...register('key')} />
        </FormField>

        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" hasError={!!errors.name} {...register('name')} />
        </FormField>

        <FormField label="Description" htmlFor="description">
          <Textarea id="description" {...register('description')} />
        </FormField>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2">Capabilities</Typography>
            <Controller name="supportsMultipleHosts" control={control} render={({ field }) => (
              <CheckboxField
                id="supportsMultipleHosts"
                label="Supports multiple hosts"
                value={field.value ?? false}
                onChange={field.onChange}
                info="Allows multiple hosts to be assigned to the same event booking."
              />
            )} />
            <Controller name="supportsRoundRobin" control={control} render={({ field }) => (
              <Box>
                <CheckboxField
                  id="supportsRoundRobin"
                  label="Supports round-robin assignment"
                  value={field.value ?? false}
                  onChange={field.onChange}
                  info="Automatically cycles through available hosts to distribute events evenly."
                />
                {errors.supportsRoundRobin ? <Typography variant="caption" color="error">{errors.supportsRoundRobin.message}</Typography> : null}
              </Box>
            )} />
          </Stack>
        </Paper>

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormField label="Min Hosts" htmlFor="minHosts" error={errors.minHosts?.message}>
            <Input id="minHosts" type="number" min="1" {...register('minHosts')} />
          </FormField>
          <FormField label="Max Hosts (blank = unlimited)" htmlFor="maxHosts" error={errors.maxHosts?.message}>
            <Input id="maxHosts" type="number" min="1" placeholder="∞" {...register('maxHosts')} />
          </FormField>
          <FormField label="Min Participants" htmlFor="minParticipants" error={errors.minParticipants?.message}>
            <Input id="minParticipants" type="number" min="1" {...register('minParticipants')} />
          </FormField>
          <FormField label="Max Participants (blank = unlimited)" htmlFor="maxParticipants" error={errors.maxParticipants?.message}>
            <Input id="maxParticipants" type="number" min="1" placeholder="∞" {...register('maxParticipants')} />
          </FormField>
        </Box>

        <FormField
          label="Sort Order"
          htmlFor="sortOrder"
          info="The order in which this interaction type appears in lists (lower numbers come first)."
        >
          <Input id="sortOrder" type="number" min="0" {...register('sortOrder')} />
        </FormField>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create interaction type'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
