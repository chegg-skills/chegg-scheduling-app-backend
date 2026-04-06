import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

interface PublicBookingLinkCellProps {
    type: 'coach' | 'team' | 'event'
    slug: string | null | undefined
    isActive?: boolean
}

export function PublicBookingLinkCell({
    type,
    slug,
    isActive = true,
}: PublicBookingLinkCellProps) {
    const theme = useTheme()
    const [copied, setCopied] = useState(false)

    const shareUrl = useMemo(() => {
        if (!slug || typeof window === 'undefined') return ''
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

            <Tooltip title={isActive ? 'Open public booking page' : 'Open preview (Entity is inactive)'} arrow>
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
                <Tooltip title="This entity is inactive and hidden from the public directory. Only direct links work." arrow>
                    <Box sx={{ display: 'flex', color: 'warning.main', ml: 0.5 }}>
                        <Link2 size={12} style={{ opacity: 0.6 }} />
                    </Box>
                </Tooltip>
            )}
        </Box>
    )
}
