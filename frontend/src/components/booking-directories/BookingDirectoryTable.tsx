import { useState, forwardRef, useImperativeHandle } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableTableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { Globe, Edit, Trash2, Eye, EyeOff, Settings } from 'lucide-react'
import type { BookingDirectory } from '@/types'
import {
  useDeleteBookingDirectory,
  useUpdateBookingDirectory,
} from '@/hooks/queries/useBookingDirectories'
import { Badge } from '@/components/shared/ui/Badge'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { RowActions } from '@/components/shared/table/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useConfirm } from '@/context/confirm'
import { BookingDirectoryForm } from './BookingDirectoryForm'
import { BookingDirectorySectionEditor } from './BookingDirectorySectionEditor'
import CircularProgress from '@mui/material/CircularProgress'
import { Button } from '@/components/shared/ui/Button'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { toTitleCase } from '@/utils/toTitleCase'

export interface BookingDirectoryTableRef {
  closeManage: (skipConfirm?: boolean) => Promise<boolean>
}

interface BookingDirectoryTableProps {
  bookingDirectories: BookingDirectory[]
  onManageStateChange?: (directory: BookingDirectory | null) => void
}

type SortKey = 'name' | 'slug' | 'sections' | 'status'

const sortAccessors: SortAccessorMap<BookingDirectory, SortKey> = {
  name: (d) => d.name,
  slug: (d) => d.slug,
  sections: (d) => d.sections.length,
  status: (d) => d.isActive,
}

interface ManageModalState {
  directory: BookingDirectory
  tab: 'details' | 'sections'
}

export const BookingDirectoryTable = forwardRef<
  BookingDirectoryTableRef,
  BookingDirectoryTableProps
>(({ bookingDirectories, onManageStateChange }, ref) => {
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
    stateOrFn:
      | ManageModalState
      | null
      | ((prev: ManageModalState | null) => ManageModalState | null)
  ) => {
    if (typeof stateOrFn === 'function') {
      setManageState((prev) => {
        const next = stateOrFn(prev)
        onManageStateChange?.(next ? next.directory : null)
        return next
      })
    } else {
      setManageState(stateOrFn)
      onManageStateChange?.(stateOrFn ? stateOrFn.directory : null)
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

  const { sortedItems, sortConfig, requestSort } = useTableSort(bookingDirectories, sortAccessors)
  const { mutate: deleteDirectory } = useDeleteBookingDirectory()
  const { mutate: updateDirectory } = useUpdateBookingDirectory()
  const { handleAction } = useAsyncAction()

  const handleToggleActive = (directory: BookingDirectory) => {
    const newStatus = !directory.isActive
    handleAction(
      updateDirectory,
      { directoryId: directory.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Activate booking directory' : 'Deactivate booking directory',
        message: newStatus
          ? `Make "${directory.name}" active? Students visiting /book/directory/${directory.slug} will see it.`
          : `Deactivate "${directory.name}"? Students will see a "not found" page.`,
        actionName: 'Update',
      }
    )
  }

  const handleDelete = (directory: BookingDirectory) => {
    handleAction(deleteDirectory, directory.id, {
      title: 'Delete booking directory',
      message: `Permanently delete "${directory.name}"? This cannot be undone.`,
      actionName: 'Delete',
    })
  }

  if (manageState) {
    const activeDirectory =
      bookingDirectories.find((d) => d.id === manageState.directory.id) ?? manageState.directory

    return (
      <Box role="dialog" aria-label="Manage Booking Directory" sx={{ mt: 1 }}>
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
                  message:
                    'You have unsaved configuration changes. Are you sure you want to discard them?',
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
              <BookingDirectoryForm
                bookingDirectory={activeDirectory}
                onSuccess={() => handleCloseManage(true)}
                onCancel={() => handleCloseManage()}
              />
            )}
            {manageState.tab === 'sections' && (
              <BookingDirectorySectionEditor
                bookingDirectory={activeDirectory}
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
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                alignItems="center"
                sx={{ width: '100%' }}
              >
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
                  form="booking-directory-sections-form"
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
            <TableTableRow>
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
            </TableTableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((directory) => (
              <TableTableRow key={directory.id} hover>
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
                        onClick={() => handleSetManageState({ directory, tab: 'sections' })}
                        sx={{
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {directory.name}
                      </Typography>
                      {directory.description && (
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
                          {directory.description}
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
                    {directory.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {directory.sections.slice(0, 3).map((s) => (
                      <Chip
                        key={s.id}
                        label={toTitleCase(s.sessionType.name)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {directory.sections.length > 3 && (
                      <Chip
                        label={`+${directory.sections.length - 3}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {directory.sections.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        No sessions
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Badge
                    label={directory.isActive ? 'Active' : 'Inactive'}
                    color={directory.isActive ? 'green' : 'red'}
                  />
                </TableCell>
                <TableCell>
                  <PublicBookingLinkCell
                    type="directory"
                    slug={directory.slug}
                    isActive={directory.isActive}
                  />
                </TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Configure sessions & teams',
                        icon: <Settings size={16} />,
                        onClick: () => handleSetManageState({ directory, tab: 'sections' }),
                      },
                      {
                        label: 'Edit details',
                        icon: <Edit size={16} />,
                        onClick: () => handleSetManageState({ directory, tab: 'details' }),
                      },
                      {
                        label: directory.isActive ? 'Deactivate' : 'Activate',
                        icon: directory.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                        onClick: () => handleToggleActive(directory),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => handleDelete(directory),
                      },
                    ]}
                  />
                </TableCell>
              </TableTableRow>
            ))}
            {sortedItems.length === 0 && (
              <TableTableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  No booking directories yet. Create one to configure the public booking directory.
                </TableCell>
              </TableTableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
})
