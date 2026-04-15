import { NavLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { User, LogOut } from 'lucide-react'
import type { NavItem } from './navConfig'

interface ExpandedSidebarContentProps {
    items: NavItem[]
    pathname: string
    logout: () => void
}

export function ExpandedSidebarContent({
    items,
    pathname,
    logout,
}: ExpandedSidebarContentProps) {
    return (
        <>
            <List sx={{ flex: 1, px: 1.5, py: 2 }}>
                {items.map(({ to, label, Icon }) => {
                    const selected = pathname === to || pathname.startsWith(`${to}/`)
                    return (
                        <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={NavLink}
                                to={to}
                                selected={selected}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 36,
                                        color: selected ? 'primary.main' : 'inherit',
                                    }}
                                >
                                    <Icon size={18} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>
            <Divider />
            <Box sx={{ p: 2 }}>
                <ListItemButton
                    component={NavLink}
                    to="/profile"
                    sx={{ borderRadius: 2, mb: 0.5 }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <User size={18} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Profile"
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    />
                </ListItemButton>
                <ListItemButton onClick={logout} sx={{ borderRadius: 2 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <LogOut size={18} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Sign out"
                        primaryTypographyProps={{ variant: 'body2' }}
                    />
                </ListItemButton>
            </Box>
        </>
    )
}
