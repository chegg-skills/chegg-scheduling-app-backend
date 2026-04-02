import Box from '@mui/material/Box'
import { useState } from 'react'
import { CheckCircle2, GitMerge, Plus, Repeat2, Users } from 'lucide-react'
import { useInteractionTypes } from '@/hooks/useInteractionTypes'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { InteractionTypeTable } from '@/components/event-interaction-types/InteractionTypeTable'
import { InteractionTypeForm } from '@/components/event-interaction-types/InteractionTypeForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useInteractionTypeStats } from '@/hooks/useStats'
import type { StatsTimeframe } from '@/types'

export function InteractionTypesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
  const { data, isLoading, error } = useInteractionTypes()
  const { data: interactionStats, isLoading: statsLoading } = useInteractionTypeStats(timeframe)

  const interactionTypes = data?.interactionTypes ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load interaction types." />

  const interactionStatItems = [
    {
      label: 'New types',
      value: interactionStats?.metrics.newInteractionTypes ?? 0,
      helperText: 'Interaction types added in the selected time frame',
      icon: <GitMerge size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active types',
      value: interactionStats?.metrics.activeInteractionTypes ?? 0,
      helperText: 'Types currently available for use',
      icon: <CheckCircle2 size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'Multi-host enabled',
      value: interactionStats?.metrics.multiHostEnabled ?? 0,
      helperText: 'Types supporting multiple hosts',
      icon: <Users size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Round robin enabled',
      value: interactionStats?.metrics.roundRobinEnabled ?? 0,
      helperText: 'Types compatible with round-robin events',
      icon: <Repeat2 size={18} />,
      accent: 'purple' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Interaction Types"
        subtitle="Define how participants interact during events."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New type
          </Button>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={interactionStats?.timeframe}
          items={interactionStatItems}
          isLoading={statsLoading}
        />

        <Box sx={{ mt: 3 }}>
          <InteractionTypeTable interactionTypes={interactionTypes} />
        </Box>
      </Box>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create interaction type"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)} sx={{ minWidth: 120 }}>
              Cancel
            </Button>
            <Button type="submit" form="create-interaction-type-form" sx={{ minWidth: 160, ml: 2 }}>
              Create interaction type
            </Button>
          </>
        }
      >
        <InteractionTypeForm
          onSuccess={() => setShowCreate(false)}
          formId="create-interaction-type-form"
        />
      </Modal>
    </Box>
  )
}
