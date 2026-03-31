import Box from '@mui/material/Box'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useInteractionTypes } from '@/hooks/useInteractionTypes'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { InteractionTypeTable } from '@/components/event-interaction-types/InteractionTypeTable'
import { InteractionTypeForm } from '@/components/event-interaction-types/InteractionTypeForm'

export function InteractionTypesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading, error } = useInteractionTypes()

  const interactionTypes = data?.interactionTypes ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load interaction types." />

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

      <Box sx={{ mt: 3 }}>
        <InteractionTypeTable interactionTypes={interactionTypes} />
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
