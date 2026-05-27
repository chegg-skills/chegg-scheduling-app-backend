import Box from '@mui/material/Box'
import { useState, useRef } from 'react'
import { Globe, Plus } from 'lucide-react'
import { useBookingPages } from '@/hooks/queries/useBookingPages'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { BookingPageTable, type BookingPageTableRef } from '@/components/booking-pages/BookingPageTable'
import { BookingPageForm } from '@/components/booking-pages/BookingPageForm'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { StatCard } from '@/components/shared/StatCard'
import type { BookingPage } from '@/types'

export function BookingPagesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPage, setSelectedPage] = useState<BookingPage | null>(null)
  const tableRef = useRef<BookingPageTableRef>(null)
  const { data: bookingPages = [], isLoading, error } = useBookingPages()

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load booking pages." />

  const isEditing = !!selectedPage
  const active = bookingPages.filter((p) => p.isActive).length
  const hasDefault = bookingPages.some((p) => p.slug === 'default')

  return (
    <Box>
      <PageHeader
        title={
          selectedPage ? (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
              <span>{selectedPage.name}</span>
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
                slug: {selectedPage.slug}
              </Typography>
            </Box>
          ) : (
            'Booking Pages'
          )
        }
        breadcrumbs={
          selectedPage
            ? [
                {
                  label: 'Booking Pages',
                  onClick: () => {
                    tableRef.current?.closeManage()
                  },
                },
              ]
            : undefined
        }
        subtitle={
          selectedPage
            ? undefined
            : 'Configure the session directory shown to students on the public booking site.'
        }
        actions={
          !isEditing ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New booking page
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4 }}>
        {!hasDefault && bookingPages.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No booking page with slug <strong>default</strong> exists. The main{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 'inherit' }}>
              /book
            </Typography>{' '}
            landing page will show an empty state until you create one.
          </Alert>
        )}

        {!isEditing && (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', mb: 3 }}>
            <StatCard
              label="Total booking pages"
              value={bookingPages.length}
              icon={<Globe size={18} />}
              accent="orange"
              helperText="Portals configured"
            />
            <StatCard
              label="Active pages"
              value={active}
              icon={<Globe size={18} />}
              accent="green"
              helperText="Publicly accessible by students"
            />
          </Box>
        )}

        <BookingPageTable
          ref={tableRef}
          bookingPages={bookingPages}
          onManageStateChange={setSelectedPage}
        />

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create booking page">
          <BookingPageForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
