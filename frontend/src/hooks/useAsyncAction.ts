import { useConfirm } from '@/context/ConfirmContext'
import { extractApiError } from '@/utils/apiError'

interface AsyncActionOptions<TData> {
  title: string
  message: string
  confirmText?: string
  actionName: string
  onSuccess?: (data: TData) => void
  onError?: (error: unknown) => void
}

/**
 * A reusable hook to handle standard async actions that require confirmation
 * and standardized error handling (alerts).
 *
 * Resolves DRY violations in table components.
 */
export function useAsyncAction() {
  const { confirm, alert } = useConfirm()

  const handleAction = async <TVariables, TData>(
    mutateFn: (variables: TVariables, options?: any) => void,
    variables: TVariables,
    options: AsyncActionOptions<TData>
  ) => {
    const confirmed = await confirm({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
    })

    if (confirmed) {
      mutateFn(variables, {
        onSuccess: (data: TData) => {
          options.onSuccess?.(data)
        },
        onError: (error: unknown) => {
          if (options.onError) {
            options.onError(error)
          } else {
            alert({
              title: `${options.actionName} Failed`,
              message: extractApiError(error),
            })
          }
        },
      })
    }
  }

  return { handleAction }
}
