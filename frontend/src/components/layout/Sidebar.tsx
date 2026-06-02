import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LogoOrange from '@/assets/Color=Orange.svg'
import CollapsedLogo from '@/assets/Shape=Circle, Color=Orange.svg'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAuth } from '@/context/auth/useAuth'
import { APP_HEADER_MIN_HEIGHT } from '@/components/shared/layoutConstants'
import { navItems } from './sidebar/navConfig'
import { ExpandedSidebarContent } from './sidebar/ExpandedSidebarContent'
import { CollapsedSidebarContent } from './sidebar/CollapsedSidebarContent'

interface SidebarProps {
  onTerminologyClick: () => void
}

export function Sidebar({ onTerminologyClick }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!user) return null

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(user.role))

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
          px: isCollapsed ? 0.5 : 3, // matches list px: 0.5 perfectly! (4px left/right spacing)
          minHeight: APP_HEADER_MIN_HEIGHT,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        <Box
          component={Link}
          to="/dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            width: isCollapsed ? '100%' : 'auto',
          }}
        >
          {isCollapsed ? (
            <Box
              sx={{
                width: '100%', // takes up full 77px width to align with nav items!
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={CollapsedLogo}
                alt="Chegg Skills"
                style={{
                  height: 64, // concrete dimensions prevent circular collapse!
                  width: 64,
                  display: 'block',
                  borderRadius: '50%', // completely circular of 64px x 64px!
                  transition: 'all 0.2s ease-in-out',
                  objectFit: 'contain',
                }}
              />
            </Box>
          ) : (
            <img
              src={LogoOrange}
              alt="Chegg Skills"
              style={{
                height: 32,
                width: 'auto',
                display: 'block',
                transition: 'all 0.2s ease-in-out',
              }}
            />
          )}
        </Box>
        {!isCollapsed && (
          <IconButton
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <ChevronsLeft size={18} />
          </IconButton>
        )}
      </Box>

      {isCollapsed ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0, pb: 0.5 }}>
            <IconButton
              onClick={() => setIsCollapsed(!isCollapsed)}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              <ChevronsRight size={18} />
            </IconButton>
          </Box>
          <CollapsedSidebarContent
            items={visibleItems}
            pathname={location.pathname}
            logout={logout}
            onTerminologyClick={onTerminologyClick}
          />
        </>
      ) : (
        <ExpandedSidebarContent
          items={visibleItems}
          pathname={location.pathname}
          logout={logout}
          onTerminologyClick={onTerminologyClick}
        />
      )}
    </Drawer>
  )
}
