import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronRight } from 'lucide-react'
import { toTitleCase } from '@/utils/toTitleCase'
import type { PublicEventCoach } from '@/types'

interface PreferredCoachStepProps {
  coaches: PublicEventCoach[]
  selectedCoachId: string | null
  onSelect: (coachId: string) => void
}

export function PreferredCoachStep({
  coaches,
  selectedCoachId,
  onSelect,
}: PreferredCoachStepProps) {
  const theme = useTheme()

  if (coaches.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No coaches are currently assigned to this event.</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
        },
        gap: 2,
        p: 1.5,
      }}
    >
      {coaches.map((c) => {
        const coach = c.coachUser
        const isSelected = selectedCoachId === c.coachUserId
        return (
          <Card
            key={c.coachUserId}
            variant="outlined"
            sx={{
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderWidth: isSelected ? 2 : 1,
              borderRadius: 1.5,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              bgcolor: isSelected
                ? alpha(theme.palette.primary.main, 0.03)
                : 'background.paper',
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px -4px rgba(0,0,0,0.06)',
              },
            }}
          >
            <CardActionArea onClick={() => onSelect(c.coachUserId)}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 2, px: 2.5 }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={(coach as any).avatarUrl ?? undefined}
                    sx={{
                      width: 44,
                      height: 44,
                      fontSize: '1.125rem',
                      bgcolor: isSelected
                        ? 'primary.main'
                        : alpha(theme.palette.secondary.main, 0.08),
                      color: isSelected ? 'white' : 'secondary.main',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {coach.firstName[0]}
                    {coach.lastName[0]}
                  </Avatar>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{ letterSpacing: -0.3, color: 'text.primary' }}
                  >
                    {toTitleCase(coach.firstName)} {toTitleCase(coach.lastName)}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                    color: isSelected ? 'white' : 'text.secondary',
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ChevronRight size={16} />
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        )
      })}
    </Box>
  )
}
