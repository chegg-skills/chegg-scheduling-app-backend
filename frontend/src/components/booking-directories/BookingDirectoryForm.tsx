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
import { useCreateBookingDirectory, useUpdateBookingDirectory } from '@/hooks/queries/useBookingDirectories'
import { extractApiError } from '@/utils/apiError'
import type { BookingDirectory } from '@/types'

const schema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface BookingDirectoryFormProps {
  bookingDirectory?: BookingDirectory
  onSuccess?: (directoryId?: string) => void
  onCancel?: () => void
}

export function BookingDirectoryForm({ bookingDirectory, onSuccess, onCancel }: BookingDirectoryFormProps) {
  const isEdit = !!bookingDirectory
  const { mutate: create, isPending: creating, error: createError } = useCreateBookingDirectory()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateBookingDirectory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: bookingDirectory?.slug ?? '',
      name: bookingDirectory?.name ?? '',
      description: bookingDirectory?.description ?? '',
    },
  })

  useEffect(() => {
    if (bookingDirectory) {
      reset({
        slug: bookingDirectory.slug,
        name: bookingDirectory.name,
        description: bookingDirectory.description ?? '',
      })
    }
  }, [bookingDirectory, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && bookingDirectory) {
      update({ directoryId: bookingDirectory.id, data: values }, { onSuccess: () => onSuccess?.() })
    } else {
      create(values, {
        onSuccess: (res) => {
          reset()
          const newDirectoryId = res.data.data?.bookingDirectory?.id
          onSuccess?.(newDirectoryId)
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
          info='Unique URL-friendly identifier (e.g. "default"). Use "default" to power the main /book landing page.'
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

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 1 }}>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create booking directory'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
