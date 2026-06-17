import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import MuiSelect from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import type { InviteStatus, UserRole } from '@/types'

export interface InviteFilterState {
  status: InviteStatus | ''
  role: UserRole | ''
}

interface InviteFiltersProps {
  filters: InviteFilterState
  onChange: (filters: InviteFilterState) => void
}

const STATUS_OPTIONS: { value: InviteStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
]

const ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'TEAM_ADMIN', label: 'Team Admin' },
  { value: 'COACH', label: 'Coach' },
]

export function InviteFilters({ filters, onChange }: InviteFiltersProps) {
  return (
    <Stack direction="row" gap={1.5} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="invite-status-label">Status</InputLabel>
        <MuiSelect
          labelId="invite-status-label"
          value={filters.status}
          label="Status"
          onChange={(e) => onChange({ ...filters, status: e.target.value as InviteStatus | '' })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="invite-role-label">Role</InputLabel>
        <MuiSelect
          labelId="invite-role-label"
          value={filters.role}
          label="Role"
          onChange={(e) => onChange({ ...filters, role: e.target.value as UserRole | '' })}
        >
          {ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
    </Stack>
  )
}
