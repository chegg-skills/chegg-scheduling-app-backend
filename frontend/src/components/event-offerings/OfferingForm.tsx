import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useCreateEventOffering, useUpdateEventOffering } from '@/hooks/useEventOfferings'
import { extractApiError } from '@/utils/apiError'
import type { EventOffering } from '@/types'

const schema = z.object({
  key: z.string().min(1, 'Key is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().nonnegative().optional(),
})

type FormValues = z.infer<typeof schema>

interface OfferingFormProps {
  offering?: EventOffering
  onSuccess?: () => void
}

export function OfferingForm({ offering, onSuccess }: OfferingFormProps) {
  const isEdit = !!offering
  const { mutate: create, isPending: creating, error: createError } = useCreateEventOffering()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEventOffering()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: offering?.key ?? '',
      name: offering?.name ?? '',
      description: offering?.description ?? '',
      sortOrder: offering?.sortOrder ?? 0,
    },
  })

  useEffect(() => {
    if (offering) reset({ key: offering.key, name: offering.name, description: offering.description ?? '', sortOrder: offering.sortOrder })
  }, [offering, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && offering) {
      update({ offeringId: offering.id, data: values }, { onSuccess })
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
          info="The order in which this offering appears in lists (lower numbers come first)."
        >
          <Input id="sortOrder" type="number" min="0" hasError={!!errors.sortOrder} {...register('sortOrder')} />
        </FormField>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create offering'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
