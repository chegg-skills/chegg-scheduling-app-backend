import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'
import Button from '@mui/material/Button'

interface ConfirmOptions {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    isAlert?: boolean
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>
    alert: (options: ConfirmOptions) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isAlert?: boolean
    onConfirm: () => void
    onCancel: () => void
}

function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Yes',
    cancelText = 'No',
    isAlert = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (isOpen) {
            // Focus the confirm button when the dialog opens
            setTimeout(() => {
                confirmButtonRef.current?.focus()
            }, 50)
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onConfirm()
        }
    }

    return (
        <Dialog
            open={isOpen}
            onClose={onCancel}
            fullWidth
            maxWidth="sm"
            onKeyDown={handleKeyDown}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                {title}
                <IconButton onClick={onCancel} aria-label="Close" size="small">
                    <X size={18} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 3 }}>
                <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Stack direction="row" spacing={1.5}>
                    {!isAlert && (
                        <Button
                            variant="outlined"
                            onClick={handleCancel}
                            size="small"
                            sx={{ borderRadius: 1.5, height: 40, px: 2, fontSize: '0.875rem' }}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color={isAlert ? 'primary' : 'error'}
                        onClick={onConfirm}
                        size="small"
                        ref={confirmButtonRef}
                        sx={{ borderRadius: 1.5, height: 40, px: 2, fontSize: '0.875rem' }}
                    >
                        {confirmText}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    )

    function handleCancel() {
        onCancel()
    }
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' })
    const [resolve, setResolve] = useState<(value: boolean) => void>(() => { })

    const confirm = useCallback((confirmOptions: ConfirmOptions): Promise<boolean> => {
        setOptions({ ...confirmOptions, isAlert: false })
        setIsOpen(true)
        return new Promise((res) => {
            setResolve(() => res)
        })
    }, [])

    const alert = useCallback((alertOptions: ConfirmOptions): Promise<void> => {
        setOptions({ ...alertOptions, isAlert: true })
        setIsOpen(true)
        return new Promise((res) => {
            setResolve(() => (_: boolean) => res())
        })
    }, [])

    const handleConfirm = () => {
        setIsOpen(false)
        resolve(true)
    }

    const handleCancel = () => {
        setIsOpen(false)
        resolve(false)
    }

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            <ConfirmDialog
                isOpen={isOpen}
                title={options.title || (options.isAlert ? 'Alert' : 'Confirm Action')}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                isAlert={options.isAlert}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    const context = useContext(ConfirmContext)
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider')
    }
    return context
}
