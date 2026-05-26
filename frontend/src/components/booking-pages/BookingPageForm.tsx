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
import { useCreateBookingPage, useUpdateBookingPage } from '@/hooks/queries/useBookingPages'
import { extractApiError } from '@/utils/apiError'
import type { BookingPage } from '@/types'

const schema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface BookingPageFormProps {
  bookingPage?: BookingPage
  onSuccess?: (pageId?: string) => void
}

export function BookingPageForm({ bookingPage, onSuccess }: BookingPageFormProps) {
  const isEdit = !!bookingPage
  const { mutate: create, isPending: creating, error: createError } = useCreateBookingPage()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateBookingPage()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: bookingPage?.slug ?? '',
      name: bookingPage?.name ?? '',
      description: bookingPage?.description ?? '',
    },
  })

  useEffect(() => {
    if (bookingPage) {
      reset({
        slug: bookingPage.slug,
        name: bookingPage.name,
        description: bookingPage.description ?? '',
      })
    }
  }, [bookingPage, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && bookingPage) {
      update({ pageId: bookingPage.id, data: values }, { onSuccess: () => onSuccess?.() })
    } else {
      create(values, {
        onSuccess: (res) => {
          reset()
          const newPageId = res.data.data?.bookingPage?.id
          onSuccess?.(newPageId)
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

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create booking page'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
