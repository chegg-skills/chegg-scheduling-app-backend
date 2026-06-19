import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

interface PublicBookingLinkCellProps {
  type: 'coach' | 'team' | 'event' | 'directory' | 'group'
  slug: string | null | undefined
  isActive?: boolean
  variant?: 'icon' | 'button'
}

export function PublicBookingLinkCell({
  type,
  slug,
  isActive = true,
  variant = 'icon',
}: PublicBookingLinkCellProps) {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!slug || typeof window === 'undefined') return ''
    if (type === 'directory') {
      return slug === 'default'
        ? `${window.location.origin}/book`
        : `${window.location.origin}/book/directory/${slug}`
    }
    return `${window.location.origin}/book/${type}/${slug}`
  }, [type, slug])

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!shareUrl) return

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!shareUrl) return
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  if (!slug) {
    return (
      <Tooltip title="Public booking slug missing. Update record to generate one." arrow>
        <Box sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>—</Box>
      </Tooltip>
    )
  }

  if (variant === 'icon') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={copied ? 'Copied!' : 'Copy public booking link'} arrow>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              color: copied ? 'success.main' : 'primary.main',
              bgcolor: alpha(copied ? theme.palette.success.main : theme.palette.primary.main, 0.05),
              '&:hover': {
                bgcolor: alpha(copied ? theme.palette.success.main : theme.palette.primary.main, 0.1),
              },
              width: 28,
              height: 28,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </IconButton>
        </Tooltip>

        <Tooltip
          title={isActive ? 'Open public booking page' : 'Open preview (Entity is inactive)'}
          arrow
        >
          <IconButton
            size="small"
            onClick={handleOpen}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
              width: 28,
              height: 28,
            }}
          >
            <ExternalLink size={14} />
          </IconButton>
        </Tooltip>

        {!isActive && (
          <Tooltip
            title="This entity is inactive and hidden from the public directory. Only direct links work."
            arrow
          >
            <Box sx={{ display: 'flex', color: 'warning.main', ml: 0.5 }}>
              <Link2 size={12} style={{ opacity: 0.6 }} />
            </Box>
          </Tooltip>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Tooltip title={copied ? 'Copied!' : 'Copy public booking link'} arrow>
        <Button
          variant="outlined"
          size="small"
          onClick={handleCopy}
          startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.725rem',
            borderRadius: 1.5,
            py: 0.25,
            px: 1.25,
            color: copied ? 'success.main' : 'primary.main',
            borderColor: copied ? 'success.main' : 'primary.main',
            bgcolor: alpha(copied ? theme.palette.success.main : theme.palette.primary.main, 0.04),
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: copied ? 'success.dark' : 'primary.dark',
              bgcolor: alpha(copied ? theme.palette.success.main : theme.palette.primary.main, 0.08),
            },
          }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </Tooltip>

      <Tooltip
        title={isActive ? 'Open public booking page' : 'Open preview (Entity is inactive)'}
        arrow
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleOpen}
          startIcon={<ExternalLink size={14} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.725rem',
            borderRadius: 1.5,
            py: 0.25,
            px: 1.25,
            color: 'text.secondary',
            borderColor: 'divider',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              color: 'primary.main',
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          Booking link
        </Button>
      </Tooltip>

      {!isActive && (
        <Tooltip
          title="This entity is inactive and hidden from the public directory. Only direct links work."
          arrow
        >
          <Box sx={{ display: 'flex', color: 'warning.main', ml: 0.5, alignItems: 'center' }}>
            <Link2 size={12} style={{ opacity: 0.6 }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}
