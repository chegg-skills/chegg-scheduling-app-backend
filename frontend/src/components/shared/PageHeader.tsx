import type { ReactNode } from 'react'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import { APP_HEADER_MIN_HEIGHT } from './layoutConstants'

import { Link as RouterLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  backTo?: string
  backLabel?: string
  tags?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
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
        minHeight: APP_HEADER_MIN_HEIGHT,
        boxSizing: 'border-box',
        px: { xs: 2.5, md: 4 },
        py: 2,
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        mb: 4,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.03)',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {backTo && !breadcrumbs && (
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
                },
              }}
            >
              <ChevronLeft size={20} />
            </IconButton>
          </Tooltip>
        )}
        <Stack spacing={0.5}>
          {breadcrumbs && (
            <Breadcrumbs
              separator={<ChevronRight size={14} />}
              sx={{ mb: 0.5, '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' } }}
            >
              {breadcrumbs.map((item, index) => (
                item.to ? (
                  <Link
                    key={index}
                    component={RouterLink}
                    to={item.to}
                    underline="hover"
                    color="inherit"
                    sx={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <Typography key={index} color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                )
              ))}
            </Breadcrumbs>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {tags && (
              <Stack direction="row" spacing={1}>
                {tags}
              </Stack>
            )}
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1.5} alignItems="center">
          {actions}
        </Stack>
      ) : null}
    </Stack>
  )
}
