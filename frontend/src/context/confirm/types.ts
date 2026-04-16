export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isAlert?: boolean
}

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: ConfirmOptions) => Promise<void>
}

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isAlert?: boolean
  onConfirm: () => void
  onCancel: () => void
}
