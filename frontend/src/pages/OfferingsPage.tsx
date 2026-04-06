import Box from '@mui/material/Box'
import { useState } from 'react'
import { CheckCircle2, Layers, Link2, Plus, XCircle } from 'lucide-react'
import { useEventOfferings } from '@/hooks/useEventOfferings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { OfferingTable } from '@/components/event-offerings/OfferingTable'
import { OfferingForm } from '@/components/event-offerings/OfferingForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useOfferingStats } from '@/hooks/useStats'
import type { StatsTimeframe } from '@/types'

export function OfferingsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
  const { data, isLoading, error } = useEventOfferings()
  const { data: offeringStats, isLoading: statsLoading } = useOfferingStats(timeframe)

  const offerings = data?.offerings ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load offerings." />

  const offeringStatItems = [
    {
      label: 'New offerings',
      value: offeringStats?.metrics.newOfferings ?? 0,
      helperText: 'Offerings added in the selected time frame',
      icon: <Layers size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active offerings',
      value: offeringStats?.metrics.activeOfferings ?? 0,
      helperText: 'Offerings currently available to teams',
      icon: <CheckCircle2 size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'In use',
      value: offeringStats?.metrics.offeringsInUse ?? 0,
      helperText: 'Offerings already connected to events',
      icon: <Link2 size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Unused',
      value: offeringStats?.metrics.unusedOfferings ?? 0,
      helperText: 'Offerings with no event usage yet',
      icon: <XCircle size={18} />,
      accent: 'purple' as const,
    },
  ]

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

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={offeringStats?.timeframe}
          items={offeringStatItems}
          isLoading={statsLoading}
        />

        <Box sx={{ mt: 3 }}>
          <OfferingTable offerings={offerings} />
        </Box>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create offering">
          <OfferingForm onSuccess={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
