import { Box, Stack, Typography, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Booking } from '@/types';

const contextItems = [
  { label: 'Specific Question', field: 'specificQuestion' },
  { label: 'Attempted Solutions', field: 'triedSolutions' },
  { label: 'Resources Used', field: 'usedResources' },
  { label: 'Session Objectives', field: 'sessionObjectives' },
] as const satisfies Array<{ label: string; field: keyof Booking }>;

interface BookingDetailsRightSectionProps {
  booking: Booking;
}

export function BookingDetailsRightSection({
  booking,
}: BookingDetailsRightSectionProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        bgcolor: alpha(theme.palette.secondary.main, 0.03),
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.05)}`,
      }}
    >
      <Typography
        variant='caption'
        sx={{
          fontWeight: 700,
          mb: 2,
          display: 'block',
          textTransform: 'uppercase',
          color: theme.palette.secondary.main,
          letterSpacing: '0.05em',
        }}
      >
        Student Problem Context
      </Typography>

      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            bottom: 8,
            left: 4,
            width: '2px',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
          }}
        />

        <Stack spacing={3}>
          {contextItems.map((item, index) => (
            <Box key={index} sx={{ position: 'relative', pl: 3.5 }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  border: `2px solid ${theme.palette.background.paper}`,
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                  zIndex: 1,
                }}
              />
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  display: 'block',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  mb: 0.5,
                }}
              >
                {item.label}
              </Typography>
              <Typography variant='body2' sx={{ lineHeight: 1.5 }}>
                {booking[item.field] || 'None provided'}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
