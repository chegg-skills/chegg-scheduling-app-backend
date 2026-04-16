import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useCreateInteractionType, useUpdateInteractionType } from '@/hooks/queries/useInteractionTypes'
import { extractApiError } from '@/utils/apiError'
import type { EventInteractionType } from '@/types'
import { InteractionTypeBasicFields } from './InteractionTypeBasicFields'
import { InteractionTypeCapabilitiesSection } from './InteractionTypeCapabilitiesSection'
import { InteractionTypeLimitsSection } from './InteractionTypeLimitsSection'
import {
  getInteractionTypeFormDefaults,
  interactionTypeFormSchema,
  type InteractionTypeFormValues,
} from './interactionTypeFormSchema'

interface InteractionTypeFormProps {
  interactionType?: EventInteractionType
  onSuccess?: () => void
  onCancel?: () => void
}

interface InteractionTypeFormWithIdProps extends InteractionTypeFormProps {
  formId?: string
}

export function InteractionTypeForm({
  interactionType,
  onSuccess,
  onCancel,
  formId,
}: InteractionTypeFormWithIdProps) {
  const isEdit = Boolean(interactionType)
  const { mutate: create, isPending: creating, error: createError } = useCreateInteractionType()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateInteractionType()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InteractionTypeFormValues>({
    resolver: zodResolver(interactionTypeFormSchema),
    defaultValues: getInteractionTypeFormDefaults(interactionType),
  })

  useEffect(() => {
    reset(getInteractionTypeFormDefaults(interactionType))
  }, [interactionType, reset])

  const supportsMultipleHosts = watch('supportsMultipleHosts') ?? false
  const supportsRoundRobin = watch('supportsRoundRobin') ?? false
  const maxHosts = watch('maxHosts')

  useEffect(() => {
    if (supportsRoundRobin && !supportsMultipleHosts) {
      setValue('supportsMultipleHosts', true, { shouldDirty: false })
    }
  }, [setValue, supportsMultipleHosts, supportsRoundRobin])

  useEffect(() => {
    if (!supportsMultipleHosts) {
      setValue('minHosts', 1, { shouldDirty: false })
      setValue('maxHosts', 1, { shouldDirty: false })
      return
    }

    if (maxHosts === 1) {
      setValue('maxHosts', 2, { shouldDirty: false })
    }
  }, [maxHosts, setValue, supportsMultipleHosts])

  function onSubmit(values: InteractionTypeFormValues) {
    if (isEdit && interactionType) {
      update({ interactionTypeId: interactionType.id, data: values }, { onSuccess })
      return
    }

    create(values, {
      onSuccess: () => {
        reset(getInteractionTypeFormDefaults())
        onSuccess?.()
      },
    })
  }

  function handleCancel() {
    reset(getInteractionTypeFormDefaults(interactionType))
    onCancel?.()
  }

  const isPending = creating || updating
  const error = createError ?? updateError

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" id={formId} onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <InteractionTypeBasicFields
          errors={errors}
          isEdit={isEdit}
          register={register}
          control={control}
        />
        <InteractionTypeCapabilitiesSection control={control} errors={errors} />
        <InteractionTypeLimitsSection
          control={control}
          errors={errors}
          register={register}
          supportsMultipleHosts={supportsMultipleHosts}
        />

        {!formId && (
          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 1 }}>
            <Button variant="secondary" type="button" onClick={handleCancel} sx={{ minWidth: 120 }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
              {isEdit ? 'Save changes' : 'Create interaction type'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
