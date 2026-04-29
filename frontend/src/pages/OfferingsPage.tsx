import Box from '@mui/material/Box'
import { useState } from 'react'
import { CheckCircle2, Layers, Link2, Plus, XCircle } from 'lucide-react'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventTypeTable } from '@/components/event-offerings/EventTypeTable'
import { EventTypeForm } from '@/components/event-offerings/EventTypeForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useOfferingStats } from '@/hooks/queries/useStats'
import type { StatsTimeframe } from '@/types'

export function OfferingsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const { data, isLoading, error } = useEventTypes()
  const { data: offeringStats, isLoading: statsLoading } = useOfferingStats(timeframe)

  const eventTypes = data?.offerings ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load event types." />

  const offeringStatItems = [
    {
      label: 'New event types',
      value: offeringStats?.metrics.newOfferings ?? 0,
      helperText: 'Event types added in the selected time frame',
      icon: <Layers size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active event types',
      value: offeringStats?.metrics.activeOfferings ?? 0,
      helperText: 'Event types currently available to teams',
      icon: <CheckCircle2 size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'In use',
      value: offeringStats?.metrics.offeringsInUse ?? 0,
      helperText: 'Event types already connected to events',
      icon: <Link2 size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Unused',
      value: offeringStats?.metrics.unusedOfferings ?? 0,
      helperText: 'Event types with no event usage yet',
      icon: <XCircle size={18} />,
      accent: 'purple' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Event Types"
        subtitle="Manage available event type categories."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New event type
          </Button>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={offeringStats?.timeframe}
          items={offeringStatItems}
          isLoading={statsLoading}
        />

        <Box sx={{ mt: 3 }}>
          <EventTypeTable eventTypes={eventTypes} />
        </Box>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create event type">
          <EventTypeForm onSuccess={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
