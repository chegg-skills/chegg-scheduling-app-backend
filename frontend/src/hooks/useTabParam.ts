import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useTabParam<T extends string>(
  paramName: string,
  defaultTab: T,
  validTabs: readonly T[],
  options?: { clearOnChange?: string[] }
): [T, (tab: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(paramName) as T | null
  const activeTab = raw !== null && validTabs.includes(raw) ? raw : defaultTab

  const clearOnChange = options?.clearOnChange

  const setTab = useCallback(
    (tab: T) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(paramName, tab)
          clearOnChange?.forEach((p) => next.delete(p))
          return next
        },
        { replace: true }
      )
    },
    [paramName, setSearchParams, clearOnChange]
  )

  return [activeTab, setTab]
}
