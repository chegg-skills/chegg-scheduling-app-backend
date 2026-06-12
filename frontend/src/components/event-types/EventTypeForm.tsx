import { useEffect, useState } from 'react'
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
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Lowercase letters, numbers, and hyphens only (e.g. group-workshop)'
    ),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().nonnegative().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventTypeFormProps {
  eventType?: EventType
  onSuccess?: () => void
  onCancel?: () => void
}

export function EventTypeForm({ eventType, onSuccess, onCancel }: EventTypeFormProps) {
  const isEdit = !!eventType
  const { mutate: create, isPending: creating, error: createError } = useCreateEventType()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEventType()
  const [keyTouched, setKeyTouched] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  // Reset keyTouched when switching between create/edit modes or editing a different record
  useEffect(() => {
    setKeyTouched(false)
    if (eventType)
      reset({
        key: eventType.key,
        name: eventType.name,
        description: eventType.description ?? '',
        sortOrder: eventType.sortOrder,
      })
  }, [eventType, reset])

  // Auto-derive key from name until the user manually edits it
  const watchedName = watch('name')
  useEffect(() => {
    if (isEdit || keyTouched) return
    const derived = watchedName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setValue('key', derived, { shouldValidate: false })
  }, [watchedName, isEdit, keyTouched, setValue])

  function onSubmit(values: FormValues) {
    if (isEdit && eventType) {
      update({ eventTypeId: eventType.id, data: values }, { onSuccess })
    } else {
      create(values, {
        onSuccess: () => {
          reset()
          setKeyTouched(false)
          onSuccess?.()
        },
      })
    }
  }

  const isPending = creating || updating
  const error = createError ?? updateError
  const keyReg = register('key')

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" hasError={!!errors.name} {...register('name')} />
        </FormField>

        <FormField
          label="Key"
          htmlFor="key"
          error={errors.key?.message}
          info="Used as the URL slug (e.g. /book/sessions/group-workshop). Auto-generated from the name — edit only if you need a custom slug."
          required
        >
          <Input
            id="key"
            hasError={!!errors.key}
            disabled={isEdit}
            {...keyReg}
            onChange={(e) => {
              keyReg.onChange(e)
              setKeyTouched(true)
            }}
          />
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

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 1 }}>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create event type'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
