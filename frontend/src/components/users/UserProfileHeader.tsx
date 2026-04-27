import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Clock, Mail, MapPin, Phone, Video } from 'lucide-react'
import { toTitleCase } from '@/utils/toTitleCase'
import type { UserWithDetails } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'

interface UserProfileHeaderProps {
  user: UserWithDetails
}

const roleColor = {
  SUPER_ADMIN: 'red' as const,
  TEAM_ADMIN: 'yellow' as const,
  COACH: 'blue' as const,
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  return (
    <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ mb: 4 }}>
      <Avatar
        src={user.avatarUrl ?? undefined}
        sx={{
          width: 80,
          height: 80,
          fontSize: '2rem',
          bgcolor: 'primary.light',
          color: 'primary.dark',
        }}
      >
        {user.firstName[0]}
        {user.lastName[0]}
      </Avatar>

      <Box sx={{ flex: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5" fontWeight={800}>
            {toTitleCase(user.firstName)} {toTitleCase(user.lastName)}
          </Typography>
          <Badge
            label={user.role.replace(/_/g, ' ')}
            color={roleColor[user.role]}
            variant="soft"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.625rem',
            }}
          />
          {!user.isActive && <Badge label="Inactive" color="red" />}
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <Mail size={16} />
              <Typography variant="body2">{user.email}</Typography>
            </Stack>
          </Grid>

          {user.phoneNumber && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <Phone size={16} />
                <Typography variant="body2">{user.phoneNumber}</Typography>
              </Stack>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <MapPin size={16} />
              <Typography variant="body2">{user.country ?? 'Not specified'}</Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 12 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <Clock size={16} />
                <Typography variant="body2">{user.timezone.replace(/_/g, ' ')} (UTC)</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <Video size={16} />
                <Typography variant="body2" sx={{ display: 'flex', gap: 0.5 }}>
                  Zoom ISV link:{' '}
                  {user.zoomIsvLink ? (
                    <Link
                      href={user.zoomIsvLink}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                        wordBreak: 'break-all',
                      }}
                    >
                      {user.zoomIsvLink}
                    </Link>
                  ) : (
                    'Not configured'
                  )}
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  )
}
