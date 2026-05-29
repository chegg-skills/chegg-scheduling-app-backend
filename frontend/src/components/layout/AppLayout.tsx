import { useState } from 'react'
import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TerminologyModal } from '@/components/shared/ui/TerminologyModal'

export function AppLayout() {
  const [terminologyOpen, setTerminologyOpen] = useState(false)

  return (
    <Box
      sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}
    >
      <Sidebar onTerminologyClick={() => setTerminologyOpen(true)} />
      <Box component="main" sx={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <Box sx={{ mx: 'auto', maxWidth: '100%', pb: 4 }}>
          <Outlet />
        </Box>
      </Box>
      <TerminologyModal open={terminologyOpen} onClose={() => setTerminologyOpen(false)} />
    </Box>
  )
}
