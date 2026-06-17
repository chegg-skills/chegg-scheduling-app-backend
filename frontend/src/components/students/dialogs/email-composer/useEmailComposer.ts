import React, { useState, useRef } from 'react'

/**
 * Owns all DOM-coupled state for the rich-text email composer: the
 * contenteditable ref + body HTML, active format state, the insert/edit-link
 * dialog, and the link hover popover. Kept as a single cohesive hook (rather than
 * three interdependent ones) because every handler shares the same `editorRef`
 * and selection — splitting that across hooks is where contenteditable bugs hide.
 *
 * Behavior is unchanged from the original inline logic in SendEmailDialog.
 */
export function useEmailComposer(open: boolean) {
  const [body, setBody] = useState('')

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

  React.useEffect(() => {
    if (open) {
      setBody('')
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

  /** Toolbar "insert link" action: saves the current selection and opens the dialog. */
  const openLinkDialog = () => {
    const sel = saveSelection()
    setSavedSelection(sel)
    setLinkUrl('')
    setLinkDialogOpen(true)
  }

  const closeLinkDialog = () => {
    setLinkDialogOpen(false)
    setEditingAnchor(null)
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
        if (
          editingAnchor.innerText.trim() === oldHref.trim() ||
          editingAnchor.innerText.trim() === cleanUrl
        ) {
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

  return {
    body,
    formatState,
    editorRef,
    handleFormat,
    handleInput,
    handleMouseMove,
    handleEditorClick,
    updateFormatState,
    openLinkDialog,
    // link dialog
    linkDialogOpen,
    linkUrl,
    setLinkUrl,
    editingAnchor,
    closeLinkDialog,
    handleConfirmLink,
    // popover
    linkPopoverAnchor,
    setLinkPopoverAnchor,
    handlePopoverMouseEnter,
    handlePopoverMouseLeave,
    handleEditLinkClick,
    handleRemoveLinkClick,
  }
}
