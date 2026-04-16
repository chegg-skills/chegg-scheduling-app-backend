import { useState, useCallback, ReactNode } from 'react'
import { ConfirmContext } from './ConfirmContext'
import { ConfirmDialog } from './ConfirmDialog'
import type { ConfirmOptions } from './types'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' })
  const [resolve, setResolve] = useState<(value: boolean) => void>(() => {})

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
