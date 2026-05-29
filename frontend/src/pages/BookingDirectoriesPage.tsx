import Box from '@mui/material/Box'
import { useState, useRef } from 'react'
import { Globe, Plus } from 'lucide-react'
import { useBookingDirectories } from '@/hooks/queries/useBookingDirectories'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { BookingDirectoryTable, type BookingDirectoryTableRef } from '@/components/booking-directories/BookingDirectoryTable'
import { BookingDirectoryForm } from '@/components/booking-directories/BookingDirectoryForm'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { StatCard } from '@/components/shared/StatCard'
import type { BookingDirectory } from '@/types'

export function BookingDirectoriesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDirectory, setSelectedDirectory] = useState<BookingDirectory | null>(null)
  const tableRef = useRef<BookingDirectoryTableRef>(null)
  const { data: bookingDirectories = [], isLoading, error } = useBookingDirectories()

  const isEditing = !!selectedDirectory
  const active = bookingDirectories.filter((d) => d.isActive).length
  const hasDefault = bookingDirectories.some((d) => d.slug === 'default')

  return (
    <Box>
      <PageHeader
        title={
          selectedDirectory ? (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
              <span>{selectedDirectory.name}</span>
              <Typography
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  bgcolor: 'grey.100',
                  px: 0.8,
                  py: 0.2,
                  borderRadius: 1,
                  verticalAlign: 'middle',
                }}
              >
                slug: {selectedDirectory.slug}
              </Typography>
            </Box>
          ) : (
            'Booking Directories'
          )
        }
        breadcrumbs={
          selectedDirectory
            ? [
                {
                  label: 'Booking Directories',
                  onClick: () => {
                    tableRef.current?.closeManage()
                  },
                },
              ]
            : undefined
        }
        subtitle={
          selectedDirectory
            ? undefined
            : 'Configure the session directory shown to students on the public booking site.'
        }
        actions={
          !isEditing ? (
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={isLoading || !!error}>
              <Plus size={16} /> New booking directory
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4 }}>
        {isLoading ? (
          <PageSpinner />
        ) : error ? (
          <ErrorAlert message="Failed to load booking directories." />
        ) : (
          <>
            {!hasDefault && bookingDirectories.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No booking directory with slug <strong>default</strong> exists. The main{' '}
                <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 'inherit' }}>
                  /book
                 </Typography>{' '}
                landing page will show an empty state until you create one.
              </Alert>
            )}

            {!isEditing && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', mb: 3 }}>
                <StatCard
                  label="Total booking directories"
                  value={bookingDirectories.length}
                  icon={<Globe size={18} />}
                  accent="orange"
                  helperText="Directories configured"
                />
                <StatCard
                  label="Active directories"
                  value={active}
                  icon={<Globe size={18} />}
                  accent="green"
                  helperText="Publicly accessible by students"
                />
              </Box>
            )}

            <BookingDirectoryTable
              ref={tableRef}
              bookingDirectories={bookingDirectories}
              onManageStateChange={setSelectedDirectory}
            />
          </>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create booking directory">
          <BookingDirectoryForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
