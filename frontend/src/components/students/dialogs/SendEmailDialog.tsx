import React, { useState, useRef } from 'react'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popover,
} from '@mui/material'
import { Bold, Italic, Underline, Link as LinkIcon, X, Edit, Trash2, ExternalLink, Send } from 'lucide-react'
import { useSendStudentEmail } from '@/hooks/queries/useStudents'
import { alpha } from '@mui/material/styles'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'

interface SendEmailDialogProps {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  studentEmail: string
}

export function SendEmailDialog({
  open,
  onClose,
  studentId,
  studentName,
  studentEmail,
}: SendEmailDialogProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Link Dialog states
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [savedSelection, setSavedSelection] = useState<Range | null>(null)

  // Link Edit/Popover states
  const [editingAnchor, setEditingAnchor] = useState<HTMLAnchorElement | null>(null)
  const [linkPopoverAnchor, setLinkPopoverAnchor] = useState<HTMLAnchorElement | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Active formatting state tracking
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
  })

  const editorRef = useRef<HTMLDivElement | null>(null)
  const { mutateAsync: sendEmail, isPending } = useSendStudentEmail()

  React.useEffect(() => {
    if (open) {
      setSubject('')
      setBody('')
      setErrorMessage(null)
      setLinkDialogOpen(false)
      setLinkUrl('')
      setSavedSelection(null)
      setEditingAnchor(null)
      setLinkPopoverAnchor(null)
      setFormatState({ bold: false, italic: false, underline: false })
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
    }
  }, [open])

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0).cloneRange()
    }
    return null
  }

  const restoreSelection = (range: Range | null) => {
    const sel = window.getSelection()
    if (sel && range) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  const updateFormatState = () => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    })
  }

  const handleFormat = (command: 'bold' | 'italic' | 'underline') => {
    const editor = editorRef.current
    if (!editor) return

    document.execCommand(command, false)

    // Keep state in sync
    setBody(editor.innerHTML)
    updateFormatState()
  }

  const handleConfirmLink = () => {
    setLinkDialogOpen(false)
    const editor = editorRef.current
    if (!editor) return

    let cleanUrl = linkUrl.trim()
    if (cleanUrl) {
      // Ensure the URL has a protocol
      if (!/^https?:\/\//i.test(cleanUrl) && !/^mailto:/i.test(cleanUrl) && !/^tel:/i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl
      }

      if (editingAnchor) {
        // We are editing an existing link! Just change its href and text
        const oldHref = editingAnchor.getAttribute('href') || ''
        editingAnchor.href = cleanUrl
        
        // If the text was exactly the old link, update the text too so they don't drift
        if (editingAnchor.innerText.trim() === oldHref.trim() || editingAnchor.innerText.trim() === cleanUrl) {
          editingAnchor.innerText = cleanUrl
        }
        setEditingAnchor(null)
      } else {
        restoreSelection(savedSelection)

        const sel = window.getSelection()
        if (sel && sel.isCollapsed) {
          const anchor = document.createElement('a')
          anchor.href = cleanUrl
          anchor.innerText = cleanUrl
          anchor.target = '_blank'
          anchor.rel = 'noopener noreferrer'
          
          if (savedSelection) {
            savedSelection.insertNode(anchor)
            savedSelection.collapse(false)
          } else {
            editor.appendChild(anchor)
          }
        } else {
          document.execCommand('createLink', false, cleanUrl)
          
          // Add target="_blank" and rel="noopener noreferrer"
          const anchors = editor.getElementsByTagName('a')
          for (let i = 0; i < anchors.length; i++) {
            if (!anchors[i].hasAttribute('target')) {
              anchors[i].setAttribute('target', '_blank')
              anchors[i].setAttribute('rel', 'noopener noreferrer')
            }
          }
        }
      }

      setBody(editor.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a') as HTMLAnchorElement | null
    
    if (anchor) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setLinkPopoverAnchor(anchor)
    } else {
      if (!hoverTimeoutRef.current) {
        hoverTimeoutRef.current = setTimeout(() => {
          setLinkPopoverAnchor(null)
          hoverTimeoutRef.current = null
        }, 400)
      }
    }
  }

  const handlePopoverMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handlePopoverMouseLeave = () => {
    if (!hoverTimeoutRef.current) {
      hoverTimeoutRef.current = setTimeout(() => {
        setLinkPopoverAnchor(null)
        hoverTimeoutRef.current = null
      }, 300)
    }
  }

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a') as HTMLAnchorElement | null
    if (anchor) {
      e.preventDefault()
      setLinkPopoverAnchor(anchor)
    }
  }

  const handleRemoveLinkClick = () => {
    if (linkPopoverAnchor) {
      const parent = linkPopoverAnchor.parentNode
      if (parent) {
        // Move all children of the anchor to the parent, then remove anchor
        while (linkPopoverAnchor.firstChild) {
          parent.insertBefore(linkPopoverAnchor.firstChild, linkPopoverAnchor)
        }
        parent.removeChild(linkPopoverAnchor)
      }
      setLinkPopoverAnchor(null)
      if (editorRef.current) {
        setBody(editorRef.current.innerHTML)
      }
    }
  }

  const handleEditLinkClick = () => {
    if (linkPopoverAnchor) {
      const url = linkPopoverAnchor.getAttribute('href') || ''
      setLinkUrl(url)
      setEditingAnchor(linkPopoverAnchor)
      setLinkDialogOpen(true)
      setLinkPopoverAnchor(null)
    }
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      setErrorMessage('Subject line is required.')
      return
    }
    const cleanBody = body.trim()
    if (!cleanBody || cleanBody === '<br>' || cleanBody === '<p></p>') {
      setErrorMessage('Email body content is required.')
      return
    }

    setErrorMessage(null)
    try {
      await sendEmail({ studentId, subject, body: cleanBody })
      onClose()
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch email. Please try again.')
    }
  }

  const getButtonStyles = (active: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: 1.25, // 10px
    p: 0,
    color: active ? 'primary.main' : 'text.secondary',
    bgcolor: active ? (theme: any) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
    border: '1px solid',
    borderColor: active ? (theme: any) => alpha(theme.palette.primary.main, 0.15) : 'transparent',
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
      color: 'primary.main',
      borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.15),
      transform: 'translateY(-0.5px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  })

  const modalFooter = (
    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
      <Button variant="secondary" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      <Button onClick={handleSend} isLoading={isPending} startIcon={<Send size={16} />}>
        Send Email
      </Button>
    </Stack>
  )

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        title="Compose Direct Email"
        size="md"
        footer={modalFooter}
      >
        <Stack spacing={3} sx={{ pb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: -1, mb: 1 }}>
            To: <strong>{studentName}</strong> ({studentEmail})
          </Typography>

          {errorMessage && <ErrorAlert message={errorMessage} />}

          <FormField label="Subject Line" htmlFor="email-subject" required>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Booking Confirmation"
              disabled={isPending}
              hasError={!!errorMessage && !subject.trim()}
            />
          </FormField>

          <FormField label="Message" htmlFor="email-body" required>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5, // 12px to match MuiOutlinedInput root
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
                },
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
                },
              }}
            >
              {/* Toolbar */}
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
                    handleFormat('bold')
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
                    handleFormat('italic')
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
                    handleFormat('underline')
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
                    const sel = saveSelection()
                    setSavedSelection(sel)
                    setLinkUrl('')
                    setLinkDialogOpen(true)
                  }}
                  disabled={isPending}
                  sx={getButtonStyles(false)}
                >
                  <LinkIcon size={16} />
                </IconButton>
              </Stack>

              {/* WYSIWYG Editor area */}
              <Box
                {...({
                  component: 'div',
                  ref: editorRef,
                  contentEditable: !isPending,
                  onInput: handleInput,
                  onMouseMove: handleMouseMove,
                  onClick: handleEditorClick,
                  onKeyUp: updateFormatState,
                  onMouseUp: updateFormatState,
                  placeholder: 'Compose your rich-text formatted message here... Select text and use the toolbar to apply styling to selected text.',
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
                  }
                } as any)}
              />
            </Box>
          </FormField>
        </Stack>
      </Modal>

      {/* Link Dialog matching the theme styling, border radius and padding of standard modals */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => {
          setLinkDialogOpen(false)
          setEditingAnchor(null)
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '16px', // Matches MuiDialog paper styles override in theme.ts
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {editingAnchor ? 'Edit Link' : 'Insert Link'}
          </Typography>
          <IconButton onClick={() => {
            setLinkDialogOpen(false)
            setEditingAnchor(null)
          }} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <FormField label="URL Address" htmlFor="link-dialog-url" required>
            <Input
              id="link-dialog-url"
              placeholder="e.g. https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && linkUrl.trim()) {
                  e.preventDefault()
                  handleConfirmLink()
                }
              }}
            />
          </FormField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="secondary" onClick={() => {
            setLinkDialogOpen(false)
            setEditingAnchor(null)
          }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmLink} disabled={!linkUrl.trim()}>
            {editingAnchor ? 'Update Link' : 'Insert URL'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Hover / Click Popover Tooltip */}
      <Popover
        open={Boolean(linkPopoverAnchor)}
        anchorEl={linkPopoverAnchor}
        onClose={() => setLinkPopoverAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableRestoreFocus
        PaperProps={{
          onMouseEnter: handlePopoverMouseEnter,
          onMouseLeave: handlePopoverMouseLeave,
          sx: {
            p: 0.75,
            px: 1.25,
            borderRadius: 2, // 8px
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            pointerEvents: 'auto',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
          },
        }}
        sx={{
          pointerEvents: 'none',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography
            variant="body2"
            sx={{
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'primary.main',
              fontWeight: 500,
              textDecoration: 'underline',
              userSelect: 'none',
            }}
          >
            {linkPopoverAnchor?.getAttribute('href') || ''}
          </Typography>

          <IconButton
            size="small"
            onClick={handleEditLinkClick}
            sx={{
              p: 0.5,
              borderRadius: 1,
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': {
                color: 'primary.main',
                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Edit size={14} />
          </IconButton>

          <IconButton
            size="small"
            onClick={handleRemoveLinkClick}
            sx={{
              p: 0.5,
              borderRadius: 1,
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': {
                color: 'primary.main',
                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Trash2 size={14} />
          </IconButton>

          <IconButton
            size="small"
            component="a"
            href={linkPopoverAnchor?.getAttribute('href') || '#'}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              p: 0.5,
              borderRadius: 1,
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': {
                color: 'primary.main',
                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <ExternalLink size={14} />
          </IconButton>
        </Stack>
      </Popover>
    </>
  )
}