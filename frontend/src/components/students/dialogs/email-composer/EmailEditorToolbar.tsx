import { Box, Stack, IconButton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Bold, Italic, Underline, Link as LinkIcon } from 'lucide-react'
import { getButtonStyles } from './editorButtonStyles'

interface EmailEditorToolbarProps {
  isPending: boolean
  formatState: { bold: boolean; italic: boolean; underline: boolean }
  onFormat: (command: 'bold' | 'italic' | 'underline') => void
  onLinkClick: () => void
}

/** Formatting toolbar (bold / italic / underline / link) for the email composer. */
export function EmailEditorToolbar({
  isPending,
  formatState,
  onFormat,
  onLinkClick,
}: EmailEditorToolbarProps) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) => alpha(theme.palette.accent?.peach || '#FFF6F0', 0.45),
        alignItems: 'center',
      }}
    >
      <IconButton
        size="small"
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('bold')
        }}
        disabled={isPending}
        sx={getButtonStyles(formatState.bold)}
      >
        <Bold size={16} />
      </IconButton>
      <IconButton
        size="small"
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('italic')
        }}
        disabled={isPending}
        sx={getButtonStyles(formatState.italic)}
      >
        <Italic size={16} />
      </IconButton>
      <IconButton
        size="small"
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('underline')
        }}
        disabled={isPending}
        sx={getButtonStyles(formatState.underline)}
      >
        <Underline size={16} />
      </IconButton>

      {/* Vertical Separator */}
      <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', mx: 0.5 }} />

      <IconButton
        size="small"
        onMouseDown={(e) => {
          e.preventDefault()
          onLinkClick()
        }}
        disabled={isPending}
        sx={getButtonStyles(false)}
      >
        <LinkIcon size={16} />
      </IconButton>
    </Stack>
  )
}
