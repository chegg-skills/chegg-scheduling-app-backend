import Box from '@mui/material/Box'
import { useInteractionTypes } from '@/hooks/queries/useInteractionTypes'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { InteractionTypeTable } from '@/components/event-interaction-types/InteractionTypeTable'

export function InteractionTypesPage() {
  const { data, isLoading, error } = useInteractionTypes()
  const interactionTypes = data?.interactionTypes ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load interaction types." />

  return (
    <Box>
      <PageHeader
        title="Interaction Types"
        subtitle="The four supported session formats and their capability flags."
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <InteractionTypeTable interactionTypes={interactionTypes} />
      </Box>
    </Box>
  )
}
