import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import type { SafeUser } from '@/types'
import type { TeamFormValues } from './teamFormSchema'

interface TeamLeadSelectorProps {
  control: Control<TeamFormValues>
  errors: FieldErrors<TeamFormValues>
  teamLeadOptions: SafeUser[]
}

function TeamLeadOptionLabel({ user, isCompact = false }: { user: SafeUser; isCompact?: boolean }) {
  return (
    <Stack direction="row" spacing={isCompact ? 1 : 2} alignItems="center">
      <Avatar
        sx={{
          width: isCompact ? 24 : 32,
          height: isCompact ? 24 : 32,
          fontSize: isCompact ? '0.75rem' : '0.875rem',
          bgcolor: 'primary.light',
          color: 'primary.dark',
        }}
      >
        {user.firstName[0]}
        {user.lastName[0]}
      </Avatar>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: isCompact ? 500 : 600 }}>
          {user.firstName} {user.lastName}
        </Typography>
        {!isCompact && (
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

export function TeamLeadSelector({ control, errors, teamLeadOptions }: TeamLeadSelectorProps) {
  return (
    <FormField
      label="Team lead"
      htmlFor="teamLeadId"
      error={errors.teamLeadId?.message}
      hint="Must be an active Team Admin user."
      required
    >
      <Controller
        name="teamLeadId"
        control={control}
        render={({ field }) => {
          const selectedUser = teamLeadOptions.find((user) => user.id === field.value)

          return (
            <Select
              {...field}
              id="teamLeadId"
              hasError={!!errors.teamLeadId}
              displayEmpty
              renderValue={() =>
                selectedUser ? (
                  <TeamLeadOptionLabel user={selectedUser} isCompact />
                ) : (
                  'Select a team lead…'
                )
              }
            >
              <MenuItem value="">Select a team lead…</MenuItem>
              {teamLeadOptions.map((user) => (
                <MenuItem key={user.id} value={user.id} sx={{ py: 1.5 }}>
                  <TeamLeadOptionLabel user={user} />
                </MenuItem>
              ))}
            </Select>
          )
        }}
      />
    </FormField>
  )
}
