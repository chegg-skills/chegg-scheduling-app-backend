import React from 'react'
import { Box } from '@mui/material'

interface EmailEditorSurfaceProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  isPending: boolean
  onInput: () => void
  onMouseMove: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
  onKeyUp: () => void
  onMouseUp: () => void
}

/** The contenteditable WYSIWYG surface for composing the email body. */
export function EmailEditorSurface({
  editorRef,
  isPending,
  onInput,
  onMouseMove,
  onClick,
  onKeyUp,
  onMouseUp,
}: EmailEditorSurfaceProps) {
  return (
    <Box
      {...({
        component: 'div',
        ref: editorRef,
        contentEditable: !isPending,
        onInput,
        onMouseMove,
        onClick,
        onKeyUp,
        onMouseUp,
        placeholder:
          'Compose your rich-text formatted message here... Select text and use the toolbar to apply styling to selected text.',
        id: 'email-body',
        sx: {
          width: '100%',
          height: '240px',
          padding: '16px',
          overflowY: 'auto',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: '0.925rem',
          lineHeight: '1.6',
          color: 'text.primary',
          bgcolor: 'transparent',
          '&:empty:before': {
            content: 'attr(placeholder)',
            color: 'text.disabled',
            fontStyle: 'italic',
            pointerEvents: 'none',
            display: 'block',
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'underline',
            cursor: 'pointer',
          },
        },
      } as any)}
    />
  )
}
