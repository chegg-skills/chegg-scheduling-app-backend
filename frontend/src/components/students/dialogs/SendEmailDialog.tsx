import React, { useState } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import { Send } from 'lucide-react'
import { useSendStudentEmail } from '@/hooks/queries/useStudents'
import { alpha } from '@mui/material/styles'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useEmailComposer } from './email-composer/useEmailComposer'
import { EmailEditorToolbar } from './email-composer/EmailEditorToolbar'
import { EmailEditorSurface } from './email-composer/EmailEditorSurface'
import { LinkDialog } from './email-composer/LinkDialog'
import { LinkPopover } from './email-composer/LinkPopover'

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { mutateAsync: sendEmail, isPending } = useSendStudentEmail()

  const composer = useEmailComposer(open)

  React.useEffect(() => {
    if (open) {
      setSubject('')
      setErrorMessage(null)
    }
  }, [open])

  const handleSend = async () => {
    if (!subject.trim()) {
      setErrorMessage('Subject line is required.')
      return
    }
    const cleanBody = composer.body.trim()
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
      <Modal isOpen={open} onClose={onClose} title="Compose Direct Email" size="md" footer={modalFooter}>
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
              <EmailEditorToolbar
                isPending={isPending}
                formatState={composer.formatState}
                onFormat={composer.handleFormat}
                onLinkClick={composer.openLinkDialog}
              />

              <EmailEditorSurface
                editorRef={composer.editorRef}
                isPending={isPending}
                onInput={composer.handleInput}
                onMouseMove={composer.handleMouseMove}
                onClick={composer.handleEditorClick}
                onKeyUp={composer.updateFormatState}
                onMouseUp={composer.updateFormatState}
              />
            </Box>
          </FormField>
        </Stack>
      </Modal>

      <LinkDialog
        open={composer.linkDialogOpen}
        isEditing={Boolean(composer.editingAnchor)}
        linkUrl={composer.linkUrl}
        onUrlChange={composer.setLinkUrl}
        onClose={composer.closeLinkDialog}
        onConfirm={composer.handleConfirmLink}
      />

      <LinkPopover
        anchor={composer.linkPopoverAnchor}
        onClose={() => composer.setLinkPopoverAnchor(null)}
        onMouseEnter={composer.handlePopoverMouseEnter}
        onMouseLeave={composer.handlePopoverMouseLeave}
        onEdit={composer.handleEditLinkClick}
        onRemove={composer.handleRemoveLinkClick}
      />
    </>
  )
}
