import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { Check, Copy, ExternalLink, Link2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import type { Team } from '@/types'

interface TeamQuickLinkProps {
  team?: Team
}

export function TeamQuickLink({ team }: TeamQuickLinkProps) {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!team?.publicBookingSlug || typeof window === 'undefined') return ''
    return `${window.location.origin}/book/team/${team.publicBookingSlug}`
  }, [team?.publicBookingSlug])

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

  if (!team) return null

  const hasSlug = !!team.publicBookingSlug
  const isActive = team.isActive

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        borderRadius: 2, // 12px, consistent with the rest of the application
        backgroundColor: 'background.paper',
        borderColor: hasSlug
          ? isActive
            ? 'divider'
            : alpha(theme.palette.warning.main, 0.3)
          : alpha(theme.palette.error.main, 0.3),
        boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        },
      }}
    >
      <CardContent sx={{ p: '20px !important' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Left Column: Icon and Info */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5, // 12px
                backgroundColor: hasSlug
                  ? isActive
                    ? alpha(theme.palette.info.main, 0.1)
                    : alpha(theme.palette.warning.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: hasSlug ? (isActive ? 'info.main' : 'warning.main') : 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {hasSlug ? <Link2 size={20} /> : <AlertCircle size={20} />}
            </Box>

            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {hasSlug ? 'Team Booking Page' : 'Booking Link Unavailable'}
                </Typography>
                {hasSlug && (
                  <Badge
                    label={isActive ? 'Active Link' : 'Inactive'}
                    color={isActive ? 'green' : 'yellow'}
                  />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                {hasSlug
                  ? isActive
                    ? 'Share this public booking link with students to view and book all public events for this team.'
                    : 'This team is inactive. Only direct booking links will work, and it is hidden from the public directory.'
                  : 'This team does not have a public booking slug. Edit team details to generate one.'}
              </Typography>
            </Box>
          </Box>

          {/* Right Column: Actions and Link display */}
          {hasSlug && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: { xs: '100%', md: 'auto' },
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                  border: '1.5px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: 1.5, // 12px
                  px: 2,
                  py: 1,
                  width: { xs: '100%', md: 320, lg: 400 },
                  height: 40,
                  boxSizing: 'border-box',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}
                >
                  {shareUrl}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Tooltip title={copied ? 'Copied!' : 'Copy public booking link'} arrow>
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    sx={{
                      color: copied ? 'success.main' : 'primary.main',
                      bgcolor: alpha(
                        copied ? theme.palette.success.main : theme.palette.primary.main,
                        0.08
                      ),
                      border: '1px solid',
                      borderColor: copied
                        ? alpha(theme.palette.success.main, 0.2)
                        : alpha(theme.palette.primary.main, 0.2),
                      '&:hover': {
                        bgcolor: alpha(
                          copied ? theme.palette.success.main : theme.palette.primary.main,
                          0.15
                        ),
                      },
                      width: 40,
                      height: 40,
                      borderRadius: 1.5, // 12px
                    }}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Open booking page" arrow>
                  <IconButton
                    size="small"
                    onClick={handleOpen}
                    sx={{
                      color: 'text.secondary',
                      bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      border: '1px solid',
                      borderColor: alpha(theme.palette.secondary.main, 0.1),
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                      },
                      width: 40,
                      height: 40,
                      borderRadius: 1.5, // 12px
                    }}
                  >
                    <ExternalLink size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
