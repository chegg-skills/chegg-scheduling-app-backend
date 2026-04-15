import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LogoOrange from '@/assets/Color=Orange.svg'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { APP_HEADER_MIN_HEIGHT } from '@/components/shared/layoutConstants'
import { navItems } from './sidebar/navConfig'
import { ExpandedSidebarContent } from './sidebar/ExpandedSidebarContent'
import { CollapsedSidebarContent } from './sidebar/CollapsedSidebarContent'

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!user) return null

  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(user.role),
  )

  const SIDEBAR_WIDTH = isCollapsed ? 85 : 260

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRightColor: 'divider',
          borderRadius: 0,
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shorter,
            }),
          overflowX: 'hidden',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          px: isCollapsed ? 1 : 3,
          minHeight: APP_HEADER_MIN_HEIGHT,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <img
              src={LogoOrange}
              alt="Chegg Skills"
              style={{
                height: 32,
                width: 'auto',
                display: 'block'
              }}
            />
          </Box>
        )}
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </IconButton>
      </Box>

      {isCollapsed ? (
        <CollapsedSidebarContent
          items={visibleItems}
          pathname={location.pathname}
          logout={logout}
        />
      ) : (
        <ExpandedSidebarContent
          items={visibleItems}
          pathname={location.pathname}
          logout={logout}
        />
      )}
    </Drawer>
  )
}
