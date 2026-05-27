import { useState, forwardRef, useImperativeHandle } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { Globe, Edit, Trash2, Eye, EyeOff, Settings } from 'lucide-react'
import type { BookingPage } from '@/types'
import { useDeleteBookingPage, useUpdateBookingPage } from '@/hooks/queries/useBookingPages'
import { Badge } from '@/components/shared/ui/Badge'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { RowActions } from '@/components/shared/table/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useConfirm } from '@/context/confirm'
import { BookingPageForm } from './BookingPageForm'
import { BookingPageSectionEditor } from './BookingPageSectionEditor'
import CircularProgress from '@mui/material/CircularProgress'
import { Button } from '@/components/shared/ui/Button'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { toTitleCase } from '@/utils/toTitleCase'

export interface BookingPageTableRef {
  closeManage: (skipConfirm?: boolean) => Promise<boolean>
}

interface BookingPageTableProps {
  bookingPages: BookingPage[]
  onManageStateChange?: (page: BookingPage | null) => void
}

type SortKey = 'name' | 'slug' | 'sections' | 'status'

const sortAccessors: SortAccessorMap<BookingPage, SortKey> = {
  name: (p) => p.name,
  slug: (p) => p.slug,
  sections: (p) => p.sections.length,
  status: (p) => p.isActive,
}

interface ManageModalState {
  page: BookingPage
  tab: 'details' | 'sections'
}

export const BookingPageTable = forwardRef<BookingPageTableRef, BookingPageTableProps>(
  ({ bookingPages, onManageStateChange }, ref) => {
    const [manageState, setManageState] = useState<ManageModalState | null>(null)
    const [isSavingSections, setIsSavingSections] = useState(false)
    const [isDirtySections, setIsDirtySections] = useState(false)

    const { confirm } = useConfirm()

    useImperativeHandle(ref, () => ({
      closeManage: async (skipConfirm = false) => {
        return handleCloseManage(skipConfirm)
      },
    }))

    const handleSetManageState = (
      stateOrFn: ManageModalState | null | ((prev: ManageModalState | null) => ManageModalState | null)
    ) => {
      if (typeof stateOrFn === 'function') {
        setManageState((prev) => {
          const next = stateOrFn(prev)
          onManageStateChange?.(next ? next.page : null)
          return next
        })
      } else {
        setManageState(stateOrFn)
        onManageStateChange?.(stateOrFn ? stateOrFn.page : null)
      }
    }

    const handleCloseManage = async (skipConfirm = false) => {
      if (isDirtySections && !skipConfirm) {
        const discard = await confirm({
          title: 'Unsaved Changes',
          message: 'You have unsaved configuration changes. Are you sure you want to discard them?',
          confirmText: 'Discard Changes',
        })
        if (!discard) return false
      }
      handleSetManageState(null)
      setIsSavingSections(false)
      setIsDirtySections(false)
      return true
    }
  const { sortedItems, sortConfig, requestSort } = useTableSort(bookingPages, sortAccessors)
  const { mutate: deletePage } = useDeleteBookingPage()
  const { mutate: updatePage } = useUpdateBookingPage()
  const { handleAction } = useAsyncAction()

  const handleToggleActive = (page: BookingPage) => {
    const newStatus = !page.isActive
    handleAction(
      updatePage,
      { pageId: page.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Activate booking page' : 'Deactivate booking page',
        message: newStatus
          ? `Make "${page.name}" active? Students visiting /book/${page.slug} will see it.`
          : `Deactivate "${page.name}"? Students will see a "not found" page.`,
        actionName: 'Update',
      }
    )
  }

  const handleDelete = (page: BookingPage) => {
    handleAction(deletePage, page.id, {
      title: 'Delete booking page',
      message: `Permanently delete "${page.name}"? This cannot be undone.`,
      actionName: 'Delete',
    })
  }

  if (manageState) {
    const activePage =
      bookingPages.find((p) => p.id === manageState.page.id) ?? manageState.page

    return (
      <Box role="dialog" aria-label="Manage Booking Page" sx={{ mt: 1 }}>
        {manageState.tab === 'sections' && (
          <SectionHeader
            title="Manage Booking Directory Sessions & Teams"
            description='Configure sessions and participating teams. Click a session to view/edit its team mappings. Click "Save Changes" at the bottom to apply, or "Cancel" to discard.'
          />
        )}
        <Paper
          variant="outlined"
          sx={{
            p: 3.5,
            borderRadius: 1,
            bgcolor: 'background.paper',
            borderColor: 'divider',
          }}
        >


          <Tabs
            value={manageState.tab}
            onChange={(_e, v) => {
              if (manageState.tab === 'sections' && v === 'details' && isDirtySections) {
                confirm({
                  title: 'Unsaved Changes',
                  message: 'You have unsaved configuration changes. Are you sure you want to discard them?',
                  confirmText: 'Discard Changes',
                }).then((discard) => {
                  if (discard) {
                    setIsDirtySections(false)
                    handleSetManageState((prev) => (prev ? { ...prev, tab: v } : null))
                  }
                })
              } else {
                handleSetManageState((prev) => (prev ? { ...prev, tab: v } : null))
              }
            }}
            sx={{ mb: 4, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="Details" value="details" />
            <Tab label="Sessions & Teams" value="sections" />
          </Tabs>

          <Box sx={{ minHeight: '300px' }}>
            {manageState.tab === 'details' && (
              <BookingPageForm
                bookingPage={activePage}
                onSuccess={() => handleCloseManage(true)}
              />
            )}
            {manageState.tab === 'sections' && (
              <BookingPageSectionEditor
                bookingPage={activePage}
                onClose={() => handleCloseManage(true)}
                onSavingChange={setIsSavingSections}
                onDirtyChange={setIsDirtySections}
              />
            )}
          </Box>

          {manageState.tab === 'sections' && (
            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center" sx={{ width: '100%' }}>
                {isSavingSections && (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mr: 'auto' }}>
                    <CircularProgress size={16} color="primary" />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Saving changes...
                    </Typography>
                  </Stack>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCloseManage()}
                  disabled={isSavingSections}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  form="booking-page-sections-form"
                  disabled={isSavingSections}
                  isLoading={isSavingSections}
                >
                  Save Changes
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    )
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                { label: 'Name', sortKey: 'name' as const },
                { label: 'Slug', sortKey: 'slug' as const },
                { label: 'Sessions', sortKey: 'sections' as const },
                { label: 'Status', sortKey: 'status' as const },
              ].map((col) => (
                <SortableHeaderCell
                  key={col.sortKey}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                />
              ))}
              <TableCell
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                Booking Link
              </TableCell>
              <TableCell
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((page) => (
              <TableRow key={page.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Globe size={18} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        onClick={() => handleSetManageState({ page, tab: 'sections' })}
                        sx={{
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {page.name}
                      </Typography>
                      {page.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            maxWidth: 280,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {page.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                    }}
                  >
                    {page.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {page.sections.slice(0, 3).map((s) => (
                      <Chip
                        key={s.id}
                        label={toTitleCase(s.sessionType.name)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {page.sections.length > 3 && (
                      <Chip
                        label={`+${page.sections.length - 3}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {page.sections.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        No sessions
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Badge
                    label={page.isActive ? 'Active' : 'Inactive'}
                    color={page.isActive ? 'green' : 'red'}
                  />
                </TableCell>
                <TableCell>
                  <PublicBookingLinkCell type="page" slug={page.slug} isActive={page.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Configure sessions & teams',
                        icon: <Settings size={16} />,
                        onClick: () => handleSetManageState({ page, tab: 'sections' }),
                      },
                      {
                        label: 'Edit details',
                        icon: <Edit size={16} />,
                        onClick: () => handleSetManageState({ page, tab: 'details' }),
                      },
                      {
                        label: page.isActive ? 'Deactivate' : 'Activate',
                        icon: page.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                        onClick: () => handleToggleActive(page),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => handleDelete(page),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  No booking pages yet. Create one to configure the public booking directory.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
})
