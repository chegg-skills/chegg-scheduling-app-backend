import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ mx: 'auto', maxWidth: '100%', px: { xs: 2.5, md: 4 }, py: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
