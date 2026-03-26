import Box from '@mui/material/Box'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useEventOfferings } from '@/hooks/useEventOfferings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { OfferingTable } from '@/components/event-offerings/OfferingTable'
import { OfferingForm } from '@/components/event-offerings/OfferingForm'

export function OfferingsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading, error } = useEventOfferings()

  const offerings = data?.offerings ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load offerings." />

  return (
    <Box>
      <PageHeader
        title="Event Offerings"
        subtitle="Manage available event offering types."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New offering
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <OfferingTable offerings={offerings} />
      </Box>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create offering">
        <OfferingForm onSuccess={() => setShowCreate(false)} />
      </Modal>
    </Box>
  )
}
