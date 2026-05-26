import Box from '@mui/material/Box'
import { useState } from 'react'
import { Globe, Plus } from 'lucide-react'
import { useBookingPages } from '@/hooks/queries/useBookingPages'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { BookingPageTable } from '@/components/booking-pages/BookingPageTable'
import { BookingPageForm } from '@/components/booking-pages/BookingPageForm'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { StatCard } from '@/components/shared/StatCard'

export function BookingPagesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: bookingPages = [], isLoading, error } = useBookingPages()

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load booking pages." />

  const active = bookingPages.filter((p) => p.isActive).length
  const hasDefault = bookingPages.some((p) => p.slug === 'default')

  return (
    <Box>
      <PageHeader
        title="Booking Pages"
        subtitle="Configure the session directory shown to students on the public booking site."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New booking page
          </Button>
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

        <BookingPageTable bookingPages={bookingPages} />

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create booking page">
          <BookingPageForm onSuccess={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
