import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/shared/Modal'
import { useUser } from '@/hooks/useUsers'
import { UserDetailView } from './UserDetailView'

interface UserDetailModalProps {
  onClose: () => void
  userId: string
}

export function UserDetailModal({ onClose, userId }: UserDetailModalProps) {
  const { data: user, isLoading } = useUser(userId)

  return (
    <Modal isOpen onClose={onClose} title="User Details" size="lg">
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : user ? (
        <UserDetailView user={user} />
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">User not found.</Typography>
        </Box>
      )}
    </Modal>
  )
}
