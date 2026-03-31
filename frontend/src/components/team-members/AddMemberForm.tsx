import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import { Square, CheckSquare } from 'lucide-react'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { useAddTeamMember } from '@/hooks/useTeamMembers'
import { useUsers } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'

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

  // Only show active non-SUPER_ADMIN users not already on the team
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

                  <TextField
                    size="small"
                    placeholder="Search members by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    error={!!errors.userIds}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                      },
                    }}
                  />

                  <Box
                    sx={{
                      maxHeight: 280,
                      overflowY: 'auto',
                      border: '1px solid',
                      borderColor: errors.userIds ? 'error.main' : 'divider',
                      borderRadius: 1.5,
                    }}
                  >
                    <List disablePadding>
                      {filteredEligible.length === 0 ? (
                        <ListItem>
                          <ListItemText
                            primary="No selectable members found."
                            sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
                          />
                        </ListItem>
                      ) : (
                        filteredEligible.map((option) => (
                          <ListItem key={option.id} disablePadding>
                            <ListItemButton onClick={() => handleToggle(option.id)} dense>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Checkbox
                                  edge="start"
                                  checked={value.includes(option.id)}
                                  tabIndex={-1}
                                  disableRipple
                                  icon={<Square size={20} />}
                                  checkedIcon={<CheckSquare size={20} />}
                                />
                              </ListItemIcon>
                              <ListItemAvatar sx={{ minWidth: 48 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: '0.75rem',
                                    bgcolor: 'primary.light',
                                    color: 'primary.dark',
                                  }}
                                >
                                  {option.firstName[0]}
                                  {option.lastName[0]}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${option.firstName} ${option.lastName}`}
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                secondary={option.email}
                                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))
                      )}
                    </List>
                  </Box>
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
