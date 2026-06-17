import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import { Plus, HelpCircle } from 'lucide-react'
import type { TabItem } from './useEventGroupTabs'

interface GroupSelectorProps {
  selectedTab: string
  tabs: TabItem[]
  themeColor: string
  canManage: boolean
  descriptionText: string
  onSelectTab: (tabId: string) => void
  onCreateNew: () => void
}

/**
 * Left side of the group control panel: the "Group:" dropdown selector (with a
 * "Create New Group..." option for managers) and the description help tooltip.
 */
export function GroupSelector({
  selectedTab,
  tabs,
  themeColor,
  canManage,
  descriptionText,
  onSelectTab,
  onCreateNew,
}: GroupSelectorProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        Group:
      </Typography>

      <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', sm: 'auto' } }}>
        <Select
          value={selectedTab}
          onChange={(e) => {
            const val = e.target.value as string
            if (val === 'create_new') {
              onCreateNew()
            } else {
              onSelectTab(val)
            }
          }}
          displayEmpty
          inputProps={{ 'aria-label': 'Select group' }}
          renderValue={(value) => {
            const selected = tabs.find((t) => t.id === value)
            if (!selected) return 'All Events'
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                {selected.color && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: selected.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selected.name}
                </Typography>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    px: 0.75,
                    py: 0.1,
                    borderRadius: '8px',
                    backgroundColor: 'grey.100',
                    color: 'text.secondary',
                    ml: 'auto',
                  }}
                >
                  {selected.count}
                </Box>
              </Box>
            )
          }}
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 1.2,
            height: 38,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(themeColor, 0.4),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: themeColor,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: themeColor,
              borderWidth: 1.5,
            },
            '& .MuiSelect-icon': {
              color: themeColor,
              transition: 'color 0.2s ease-in-out',
            },
          }}
        >
          {tabs.map((tab) => {
            const tabColor = tab.color ?? '#E87100'
            return (
              <MenuItem
                key={tab.id}
                value={tab.id}
                sx={{
                  py: 1,
                  px: 2,
                  fontSize: '0.875rem',
                  fontWeight: selectedTab === tab.id ? 600 : 400,
                  '&.Mui-selected': {
                    backgroundColor: alpha(tabColor, 0.08),
                    color: tabColor,
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: alpha(tabColor, 0.12),
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  {tab.color ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: tab.color,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    // Indentation alignment placeholder
                    <Box sx={{ width: 8, height: 8 }} />
                  )}
                  <Typography variant="body2">{tab.name}</Typography>
                  <Box
                    sx={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.1,
                      borderRadius: '6px',
                      backgroundColor: selectedTab === tab.id ? alpha(tabColor, 0.12) : 'grey.100',
                      color: selectedTab === tab.id ? tabColor : 'text.secondary',
                      ml: 'auto',
                    }}
                  >
                    {tab.count}
                  </Box>
                </Box>
              </MenuItem>
            )
          })}
          {canManage && (
            <MenuItem
              value="create_new"
              sx={{
                py: 1.25,
                px: 2,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'primary.main',
                borderTop: '1px solid',
                borderColor: 'divider',
                gap: 1.25,
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <Plus size={16} />
              Create New Group...
            </MenuItem>
          )}
        </Select>
      </FormControl>

      <Tooltip title={descriptionText} arrow placement="top">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            color: 'text.secondary',
            opacity: 0.6,
            cursor: 'pointer',
            '&:hover': {
              opacity: 1,
              color: 'primary.main',
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
            transition: 'all 0.2s',
          }}
        >
          <HelpCircle size={16} />
        </Box>
      </Tooltip>
    </Stack>
  )
}
