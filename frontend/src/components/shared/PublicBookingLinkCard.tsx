import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { Button } from './Button'

interface PublicBookingLinkCardProps {
  title: string
  description: string
  path?: string | null
  disabledReason?: string
}

export function PublicBookingLinkCard({
  title,
  description,
  path,
  disabledReason,
}: PublicBookingLinkCardProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!path || typeof window === 'undefined') return ''
    return `${window.location.origin}${path}`
  }, [path])

  const handleCopy = async () => {
    if (!shareUrl) return

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleOpen = () => {
    if (!shareUrl) return
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <Link2 size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            wordBreak: 'break-all',
            color: shareUrl ? 'text.primary' : 'text.secondary',
          }}
        >
          {shareUrl ||
            disabledReason ||
            'Public link will appear once this record has a booking slug.'}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button size="sm" onClick={handleCopy} disabled={!shareUrl}>
            <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleOpen} disabled={!shareUrl}>
            <ExternalLink size={16} /> Open link
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
