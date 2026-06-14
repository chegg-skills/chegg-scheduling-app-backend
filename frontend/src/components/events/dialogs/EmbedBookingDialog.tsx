import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { Check, Copy } from 'lucide-react'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { Event } from '@/types'

interface EmbedBookingDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
}

export function EmbedBookingDialog({ isOpen, onClose, event }: EmbedBookingDialogProps) {
  const [widthMode, setWidthMode] = useState<'responsive' | 'custom'>('responsive')
  const [customWidth, setCustomWidth] = useState(800)
  const [height, setHeight] = useState(700)
  const [copied, setCopied] = useState(false)

  const canEmbed = event.isActive && event.publicBookingSlug

  const bookingUrl = canEmbed
    ? `${window.location.origin}/book/event/${event.publicBookingSlug}?embed=true`
    : ''

  const widthAttr = widthMode === 'responsive' ? '100%' : `${customWidth}px`

  const snippet = canEmbed
    ? `<iframe\n  src="${bookingUrl}"\n  title="Book a session — ${event.name}"\n  width="${widthAttr}"\n  height="${height}"\n  loading="lazy"\n  style="border: none;"\n></iframe>`
    : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to website" size="md">
      <Stack spacing={3}>
        {!canEmbed ? (
          <Alert severity="warning">
            {!event.publicBookingSlug
              ? 'This event has no public URL yet. Set one in the event settings before embedding.'
              : 'This event is inactive. Activate it before generating an embed snippet.'}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Copy the code below and paste it into any webpage. Students can book directly without
              leaving your site.
            </Typography>

            <FormField label="Width" htmlFor="embed-width-mode">
              <Stack spacing={1.5}>
                <ToggleButtonGroup
                  value={widthMode}
                  exclusive
                  onChange={(_e, val) => val && setWidthMode(val)}
                  size="small"
                  sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.8125rem' } }}
                >
                  <ToggleButton value="responsive">100% (Responsive)</ToggleButton>
                  <ToggleButton value="custom">Custom (px)</ToggleButton>
                </ToggleButtonGroup>
                {widthMode === 'custom' && (
                  <Input
                    id="embed-custom-width"
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Math.max(200, Number(e.target.value)))}
                    inputProps={{ min: 200, max: 2000 }}
                    sx={{ maxWidth: 140 }}
                  />
                )}
              </Stack>
            </FormField>

            <FormField label="Height (px)" htmlFor="embed-height">
              <Input
                id="embed-height"
                type="number"
                value={height}
                onChange={(e) =>
                  setHeight(Math.min(1200, Math.max(500, Number(e.target.value))))
                }
                inputProps={{ min: 500, max: 1200 }}
                sx={{ maxWidth: 140 }}
              />
            </FormField>

            <FormField label="Embed code" htmlFor="embed-code-block">
              <Box
                sx={{
                  position: 'relative',
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 2,
                  pr: 6,
                }}
              >
                <Typography
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    m: 0,
                  }}
                >
                  {snippet}
                </Typography>
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleCopy}
                    startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                    sx={{ minWidth: 80 }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </Box>
              </Box>
            </FormField>
          </>
        )}
      </Stack>
    </Modal>
  )
}
