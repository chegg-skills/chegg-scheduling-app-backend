import type { ReactNode } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import { toTitleCase } from '@/utils/toTitleCase'
import { getUserInitials } from '@/utils/userDisplay'

interface UserIdentityProps {
  firstName: string
  lastName: string
  /** Secondary caption line (e.g. email). Omitted when falsy. */
  email?: string | null
  avatarUrl?: string | null
  /** Avatar diameter in px. Default 36. */
  size?: number
  /** Apply `toTitleCase` to the displayed name. Default false (raw). */
  titleCase?: boolean
  /** When provided, the name becomes clickable with hover-underline link styling. */
  onClick?: () => void
  /**
   * Avatar color scheme.
   * - `primary`: primary.light bg / primary.dark text (default)
   * - `secondary`: translucent secondary bg / secondary.main text
   */
  avatarVariant?: 'primary' | 'secondary'
  /** Escape hatch for residual avatar styling differences (merged last). */
  avatarSx?: SxProps<Theme>
  /** Override the default secondary (email) line. */
  secondary?: ReactNode
}

/**
 * Avatar + name (+ optional email) block shared across member/coach/user lists.
 * Reproduces the previously duplicated layout; variation is expressed via props
 * so each call site keeps its exact rendering.
 */
export function UserIdentity({
  firstName,
  lastName,
  email,
  avatarUrl,
  size = 36,
  titleCase = false,
  onClick,
  avatarVariant = 'primary',
  avatarSx,
  secondary,
}: UserIdentityProps) {
  const theme = useTheme()

  const variantSx =
    avatarVariant === 'secondary'
      ? {
          bgcolor: alpha(theme.palette.secondary.main, 0.05),
          color: theme.palette.secondary.main,
        }
      : { bgcolor: 'primary.light', color: 'primary.dark' }

  const displayName = titleCase
    ? `${toTitleCase(firstName)} ${toTitleCase(lastName)}`
    : `${firstName} ${lastName}`

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        src={avatarUrl ?? undefined}
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          ...variantSx,
          ...avatarSx,
        }}
      >
        {getUserInitials(firstName, lastName)}
      </Avatar>
      <Box>
        <Typography
          variant="body2"
          onClick={onClick}
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            textDecoration: 'none',
            cursor: onClick ? 'pointer' : 'default',
            '&:hover': {
              color: onClick ? 'primary.main' : 'inherit',
              textDecoration: onClick ? 'underline' : 'none',
            },
          }}
        >
          {displayName}
        </Typography>
        {secondary ??
          (email && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {email}
            </Typography>
          ))}
      </Box>
    </Stack>
  )
}
