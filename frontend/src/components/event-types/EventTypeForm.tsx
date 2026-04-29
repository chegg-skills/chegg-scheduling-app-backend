import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useCreateEventType, useUpdateEventType } from '@/hooks/queries/useEventTypes'
import { extractApiError } from '@/utils/apiError'
import type { EventType } from '@/types'

const schema = z.object({
  key: z.string().min(1, 'Key is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().nonnegative().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventTypeFormProps {
  eventType?: EventType
  onSuccess?: () => void
}

export function EventTypeForm({ eventType, onSuccess }: EventTypeFormProps) {
  const isEdit = !!eventType
  const { mutate: create, isPending: creating, error: createError } = useCreateEventType()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEventType()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: eventType?.key ?? '',
      name: eventType?.name ?? '',
      description: eventType?.description ?? '',
      sortOrder: eventType?.sortOrder ?? 0,
    },
  })

  useEffect(() => {
    if (eventType)
      reset({
        key: eventType.key,
        name: eventType.name,
        description: eventType.description ?? '',
        sortOrder: eventType.sortOrder,
      })
  }, [eventType, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && eventType) {
      update({ eventTypeId: eventType.id, data: values }, { onSuccess })
    } else {
      create(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
        },
      })
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
          <Input id="key" hasError={!!errors.key} disabled={isEdit} {...register('key')} />
        </FormField>

        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" hasError={!!errors.name} {...register('name')} />
        </FormField>

        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" {...register('description')} />
        </FormField>

        <FormField
          label="Sort order"
          htmlFor="sortOrder"
          error={errors.sortOrder?.message}
          info="The order in which this event type appears in lists (lower numbers come first)."
        >
          <Input
            id="sortOrder"
            type="number"
            min="0"
            hasError={!!errors.sortOrder}
            {...register('sortOrder')}
          />
        </FormField>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create event type'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
