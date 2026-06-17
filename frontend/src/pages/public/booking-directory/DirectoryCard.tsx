import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { ArrowRight } from 'lucide-react'

interface DirectoryCardProps {
  icon: ReactNode
  title: string
  description?: string | null
  /** Caption shown when no description is provided. */
  placeholder: string
  /** Fully-formed chip rendered below the description. */
  chip: ReactNode
  onClick: () => void
}

/**
 * Shared selectable card shell for the booking directory (category and team
 * cards). Icon / title / description / chip / arrow layout with hover effects.
 */
export function DirectoryCard({
  icon,
  title,
  description,
  placeholder,
  chip,
  onClick,
}: DirectoryCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 1.5,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 12px 24px -10px rgba(232, 113, 0, 0.12)',
          transform: 'translateY(-4px)',
          '& .arrow-icon': {
            bgcolor: 'primary.main',
            color: 'white',
            transform: 'translateX(4px)',
          },
          '& .card-icon': {
            bgcolor: 'primary.light',
            color: 'primary.main',
            boxShadow: '0 2px 8px rgba(232, 113, 0, 0.08)',
          },
        },
      }}
    >
      <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box
          className="card-icon"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              mb: 0.5,
              lineHeight: 1.3,
              textTransform: 'none',
            }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 1.5,
              }}
            >
              {description}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1.5 }}
            >
              {placeholder}
            </Typography>
          )}
          {chip}
        </Box>
      </Stack>
      <Box
        className="arrow-icon"
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          ml: 2,
        }}
      >
        <ArrowRight size={16} />
      </Box>
    </Paper>
  )
}
