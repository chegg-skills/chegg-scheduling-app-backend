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
import { useCreateSessionType, useUpdateSessionType } from '@/hooks/queries/useSessionTypes'
import { extractApiError } from '@/utils/apiError'
import type { SessionType } from '@/types'

const schema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().nonnegative().optional(),
})

type FormValues = z.infer<typeof schema>

interface SessionTypeFormProps {
  sessionType?: SessionType
  onSuccess?: () => void
}

export function SessionTypeForm({ sessionType, onSuccess }: SessionTypeFormProps) {
  const isEdit = !!sessionType
  const { mutate: create, isPending: creating, error: createError } = useCreateSessionType()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateSessionType()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: sessionType?.slug ?? '',
      name: sessionType?.name ?? '',
      description: sessionType?.description ?? '',
      sortOrder: sessionType?.sortOrder ?? 0,
    },
  })

  useEffect(() => {
    if (sessionType) {
      reset({
        slug: sessionType.slug,
        name: sessionType.name,
        description: sessionType.description ?? '',
        sortOrder: sessionType.sortOrder,
      })
    }
  }, [sessionType, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && sessionType) {
      update({ sessionTypeId: sessionType.id, data: values }, { onSuccess })
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
          label="Slug"
          htmlFor="slug"
          error={errors.slug?.message}
          info="Unique URL-friendly identifier (e.g. one-to-one-tutoring). Cannot be changed after creation."
          required
        >
          <Input id="slug" hasError={!!errors.slug} disabled={isEdit} {...register('slug')} />
        </FormField>

        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" hasError={!!errors.name} {...register('name')} />
        </FormField>

        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" rows={3} {...register('description')} />
        </FormField>

        <FormField
          label="Sort order"
          htmlFor="sortOrder"
          error={errors.sortOrder?.message}
          info="Lower numbers appear first in the public session directory."
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
            {isEdit ? 'Save changes' : 'Create session type'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
