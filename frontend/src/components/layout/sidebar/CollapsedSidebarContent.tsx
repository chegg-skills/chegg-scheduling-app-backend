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

interface CollapsedSidebarContentProps {
    items: NavItem[]
    pathname: string
    logout: () => void
}

export function CollapsedSidebarContent({
    items,
    pathname,
    logout,
}: CollapsedSidebarContentProps) {
    return (
        <>
            <List sx={{ flex: 1, px: 0.5, py: 2 }}>
                {items.map(({ to, label, Icon }) => {
                    const selected = pathname === to || pathname.startsWith(`${to}/`)
                    return (
                        <ListItem key={to} disablePadding sx={{ mb: 1.5 }}>
                            <ListItemButton
                                component={NavLink}
                                to={to}
                                selected={selected}
                                sx={{
                                    borderRadius: 2,
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    py: 1.5,
                                    px: 0.5,
                                    minHeight: 64,
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mb: 0.5,
                                        justifyContent: 'center',
                                        color: selected ? 'primary.main' : 'inherit',
                                    }}
                                >
                                    <Icon size={22} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    primaryTypographyProps={{
                                        variant: 'caption',
                                        fontWeight: 600,
                                        sx: {
                                            fontSize: '0.65rem',
                                            lineHeight: 1.2,
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'center',
                                        },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>
            <Divider />
            <Box sx={{ p: 1 }}>
                <ListItemButton
                    component={NavLink}
                    to="/profile"
                    sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 1.5,
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 0, mb: 0.5, justifyContent: 'center' }}>
                        <User size={18} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Profile"
                        primaryTypographyProps={{
                            variant: 'caption',
                            fontWeight: 600,
                            sx: { fontSize: '0.65rem' },
                        }}
                    />
                </ListItemButton>
                <ListItemButton
                    onClick={logout}
                    sx={{
                        borderRadius: 2,
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 1.5,
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 0, mb: 0.5, justifyContent: 'center' }}>
                        <LogOut size={18} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Sign out"
                        primaryTypographyProps={{
                            variant: 'caption',
                            sx: { fontSize: '0.65rem' },
                        }}
                    />
                </ListItemButton>
            </Box>
        </>
    )
}
