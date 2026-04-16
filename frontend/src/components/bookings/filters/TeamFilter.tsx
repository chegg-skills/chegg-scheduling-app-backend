import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useTeams } from '@/hooks/queries/useTeams'

interface TeamFilterProps {
  value: string
  onChange: (teamId: string) => void
}

export function TeamFilter({ value, onChange }: TeamFilterProps) {
  const { data, isLoading } = useTeams()
  const teams = data?.teams ?? []

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value)
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="team-filter-label">Filter by Team</InputLabel>
      <Select
        labelId="team-filter-label"
        id="team-filter"
        value={value}
        label="Filter by Team"
        onChange={handleChange}
        disabled={isLoading}
      >
        <MenuItem value="">
          <em>All Teams</em>
        </MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>
            {team.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
