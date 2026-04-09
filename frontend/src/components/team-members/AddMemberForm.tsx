import * as React from 'react'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Input } from '@/components/shared/Input'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { useAddTeamMember } from '@/hooks/useTeamMembers'
import { useUsers } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'
import { UserSelectionList } from './UserSelectionList'

const schema = z.object({ userIds: z.array(z.string()).min(1, 'Select at least one user') })
type FormValues = z.infer<typeof schema>

interface AddMemberFormProps {
  teamId: string
  existingMemberIds: string[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddMemberForm({ teamId, existingMemberIds, onSuccess, onCancel }: AddMemberFormProps) {
  const [search, setSearch] = useState('')
  const { mutate, isPending, error } = useAddTeamMember(teamId)
  const { data: usersData } = useUsers({ pageSize: 200 })

  const eligible = (usersData?.users ?? []).filter(
    (u) => u.isActive && u.role !== 'SUPER_ADMIN' && !existingMemberIds.includes(u.id),
  )

  const filteredEligible = eligible.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  )

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userIds: [] }
  })

  const selectedUserIds = watch('userIds')

  function onSubmit(values: FormValues) {
    mutate(values.userIds, {
      onSuccess: () => {
        reset()
        setSearch('')
        onSuccess?.()
      },
    })
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={2.5}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      <Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Select one or more users to add to your team.
        </Typography>
        <FormField label="Users" htmlFor="userIds" error={errors.userIds?.message} required>
          <Controller
            name="userIds"
            control={control}
            render={({ field: { value, onChange } }) => {
              const handleToggle = (id: string) => {
                const newSelected = value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
                onChange(newSelected)
              }

              return (
                <Stack spacing={1.5} sx={{ width: '100%' }}>
                  {value.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {value.map((id) => {
                        const user = usersData?.users.find((u) => u.id === id)
                        if (!user) return null
                        return <Badge key={id} label={`${user.firstName} ${user.lastName}`} variant="blue" />
                      })}
                    </Box>
                  )}

                  <Input
                    isSearch
                    placeholder="Search members by name or email…"
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    hasError={!!errors.userIds}
                  />

                  <UserSelectionList
                    users={filteredEligible}
                    selectedUserIds={value}
                    onToggle={handleToggle}
                    error={!!errors.userIds}
                  />
                </Stack>
              )
            }}
          />
        </FormField>
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isPending} disabled={!selectedUserIds || selectedUserIds.length === 0}>
          Add members
        </Button>
      </Stack>
    </Stack>
  )
}
