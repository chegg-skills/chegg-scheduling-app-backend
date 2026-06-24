import { Box, Stack, Typography, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Booking } from '@/types'

const contextItems = [
  { label: 'Specific Question', field: 'specificQuestion' },
  { label: 'Attempted Solutions', field: 'triedSolutions' },
  { label: 'Resources Used', field: 'usedResources' },
  { label: 'Session Objectives', field: 'sessionObjectives' },
] as const satisfies Array<{ label: string; field: keyof Booking }>

interface ProblemContextTabProps {
  booking: Booking
}

/**
 * "Problem Context" tab — renders the student's custom-question answers when
 * present, otherwise the four standard intake context items, as a timeline.
 */
export function ProblemContextTab({ booking }: ProblemContextTabProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        maxHeight: { xs: '380px', md: 'none' },
        overflowY: 'auto',
        pr: 1.5,
        mr: -1.5,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: '3px',
          '&:hover': {
            background: alpha(theme.palette.text.secondary, 0.4),
          },
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
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
          {booking.customQuestions && booking.customQuestions.length > 0
            ? booking.customQuestions.map((question, idx) => (
                <Box key={idx} sx={{ position: 'relative', pl: 3.5 }}>
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
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                      display: 'block',
                      textTransform: 'uppercase',
                      fontSize: '0.65rem',
                      mb: 0.5,
                    }}
                  >
                    {question}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {booking.customAnswers?.[idx] || 'None provided'}
                  </Typography>
                </Box>
              ))
            : contextItems.map((item, index) => (
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
                    variant="caption"
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
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {booking[item.field] || 'None provided'}
                  </Typography>
                </Box>
              ))}

          {booking.notes && (
            <Box sx={{ position: 'relative', pl: 3.5 }}>
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
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  display: 'block',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  mb: 0.5,
                }}
              >
                Additional Notes
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {booking.notes}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
