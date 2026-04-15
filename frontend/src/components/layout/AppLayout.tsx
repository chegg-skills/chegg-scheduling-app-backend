import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <Box
      sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}
    >
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <Box sx={{ mx: 'auto', maxWidth: '100%', pb: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
