import type { ReactNode } from 'react'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { Link as RouterLink } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
  tags?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel,
  tags
}: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        px: { xs: 2.5, md: 4 },
        py: 2,
        backgroundColor: "white",
        borderBottom: '1px solid',
        borderColor: 'divider',
        mb: 4,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.03)',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {backTo && (
          <Tooltip title={backLabel ? `Back to ${backLabel}` : 'Back'} placement="bottom">
            <IconButton
              component={RouterLink}
              to={backTo}
              size="small"
              sx={{
                bgcolor: 'transparent',
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '50%',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'text.secondary',
                }
              }}
            >
              <ChevronLeft size={20} />
            </IconButton>
          </Tooltip>
        )}
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
            {tags && <Stack direction="row" spacing={1}>{tags}</Stack>}
          </Stack>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Stack>
      </Stack>
      {actions ? <Stack direction="row" spacing={1.5} alignItems="center">{actions}</Stack> : null}
    </Stack>
  )
}
