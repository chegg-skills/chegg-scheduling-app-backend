import Box from '@mui/material/Box'
import { useState } from 'react'
import { Tag, Plus } from 'lucide-react'
import { useSessionTypes } from '@/hooks/queries/useSessionTypes'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { SessionTypeTable } from '@/components/session-types/SessionTypeTable'
import { SessionTypeForm } from '@/components/session-types/SessionTypeForm'
import { StatCard } from '@/components/shared/StatCard'

export function SessionTypesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: sessionTypes = [], isLoading, error } = useSessionTypes()

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load session types." />

  const active = sessionTypes.filter((st) => st.isActive).length

  return (
    <Box>
      <PageHeader
        title="Session Types"
        subtitle="Define public-facing session categories that students discover when booking."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New session type
          </Button>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            mb: 3,
          }}
        >
          <StatCard
            label="Total session types"
            value={sessionTypes.length}
            icon={<Tag size={18} />}
            accent="orange"
            helperText="Categories defined for public booking"
          />
          <StatCard
            label="Active session types"
            value={active}
            icon={<Tag size={18} />}
            accent="green"
            helperText="Available on the booking portal"
          />
          <StatCard
            label="Inactive session types"
            value={sessionTypes.length - active}
            icon={<Tag size={18} />}
            accent="purple"
            helperText="Hidden from students"
          />
        </Box>

        <SessionTypeTable sessionTypes={sessionTypes} />

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create session type">
          <SessionTypeForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </Modal>
      </Box>
    </Box>
  )
}
