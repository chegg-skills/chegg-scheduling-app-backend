import { useState } from 'react'

/**
 * Copy text to the clipboard and expose a transient `copied` flag that resets
 * after `resetMs` (default 2s). Encapsulates the copy-then-reset pattern that is
 * duplicated across several components.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), resetMs)
  }

  return { copied, copy }
}
