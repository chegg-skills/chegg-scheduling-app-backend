import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTeams } from '@/hooks/useTeams';
import { useTeamEvents } from '@/hooks/useEvents';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSpinner } from '@/components/shared/Spinner';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { EventTable } from '@/components/events/EventTable';
import { Select } from '@/components/shared/Select';

export function EventsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useTeams();
  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useTeamEvents(selectedTeamId, { page: 1, pageSize: 100 });

  if (teamsLoading) return <PageSpinner />;
  if (teamsError) return <ErrorAlert message="Failed to load teams." />;

  return (
    <Box>
      <PageHeader
        title="Events"
        subtitle="View events by team"
        actions={
          <Box sx={{ width: { xs: '100%', sm: 280 } }}>
            <Box sx={{ position: 'relative', pt: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 12,
                  zIndex: 1,
                  px: 0.75,
                  backgroundColor: 'background.paper',
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderRadius: 1,
                  lineHeight: 1.2,
                }}
              >
                Search Team
              </Typography>

              <Select
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value as string)}
                displayEmpty
                inputProps={{ 'aria-label': 'Select team' }}
                renderValue={value => {
                  if (!value) {
                    return <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>Choose a team...</Box>;
                  }

                  return teamsData?.teams?.find(team => team.id === value)?.name ?? 'Choose a team...';
                }}
                sx={{
                  minWidth: { xs: '100%', sm: 280 },
                  backgroundColor: 'background.paper',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: selectedTeamId ? 'primary.main' : '#D9DEE8',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    borderColor: 'primary.main',
                  },
                  '& .MuiSelect-select': {
                    py: 1.25,
                    fontWeight: 600,
                  },
                  '& .MuiSelect-icon': {
                    color: 'primary.main',
                  },
                }}
              >
                <MenuItem value="">
                  Choose a team...
                </MenuItem>
                {teamsData?.teams?.map(team => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        }
      />
      {selectedTeamId === '' ? (
        <Typography variant="body2" color="text.secondary">Please select a team to view its events.</Typography>
      ) : eventsLoading ? (
        <PageSpinner />
      ) : eventsError ? (
        <ErrorAlert message="Failed to load events." />
      ) : (
        <Box sx={{ mt: 3 }}>
          <EventTable events={eventsData?.events ?? []} teamId={selectedTeamId} />
        </Box>
      )}
    </Box>
  );
}
