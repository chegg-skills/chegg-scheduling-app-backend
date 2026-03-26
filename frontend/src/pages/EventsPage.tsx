import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
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
      <PageHeader title="Events" subtitle="View events by team" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="subtitle1">Select Team:</Typography>
        <Box sx={{ minWidth: 220 }}>
          <Select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value as string)}
            displayEmpty
            inputProps={{ 'aria-label': 'Select team' }}
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
      </Stack>
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
