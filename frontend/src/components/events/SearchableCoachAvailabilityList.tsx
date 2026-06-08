import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import { Input } from '@/components/shared/form/Input'
import type { SafeUser } from '@/types'

interface CoachAvailabilityEntry {
  coachUserId: string
  coachUser: SafeUser
  isAvailable: boolean
  conflicts: any[]
}

interface SearchableCoachAvailabilityListProps {
  id?: string
  coaches: CoachAvailabilityEntry[]
  selectedCoachId: string
  onSelectCoach: (coachUserId: string) => void
  preAssignedCoachId?: string | null
  isLoading?: boolean
}

export function SearchableCoachAvailabilityList({
  id = 'coach-search',
  coaches,
  selectedCoachId,
  onSelectCoach,
  preAssignedCoachId = null,
  isLoading = false,
}: SearchableCoachAvailabilityListProps) {
  const [isListVisible, setIsListVisible] = useState<boolean>(false)
  const selectedCoach = coaches.find((c) => c.coachUserId === selectedCoachId)

  // Initialize query with selected coach's name, or empty
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Keep search query in sync with selection updates (e.g. initial load or closing list)
  useEffect(() => {
    if (!isListVisible) {
      setSearchQuery(
        selectedCoach
          ? `${selectedCoach.coachUser.firstName} ${selectedCoach.coachUser.lastName}`
          : ''
      )
    }
  }, [selectedCoachId, isListVisible, selectedCoach])

  // Filter list of coaches based on searchQuery
  const filteredCoachList = coaches.filter((c) => {
    const fullName = `${c.coachUser.firstName} ${c.coachUser.lastName}`.toLowerCase()
    const email = (c.coachUser.email ?? '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  const handleSelectCoach = (c: CoachAvailabilityEntry) => {
    onSelectCoach(c.coachUserId)
    setSearchQuery(`${c.coachUser.firstName} ${c.coachUser.lastName}`)
    setIsListVisible(false)
  }

  const handleClearSearch = () => {
    onSelectCoach('')
    setSearchQuery('')
  }

  const handleClickAway = () => {
    setIsListVisible(false)
    if (selectedCoachId) {
      const currentSelected = coaches.find((c) => c.coachUserId === selectedCoachId)
      if (currentSelected) {
        setSearchQuery(
          `${currentSelected.coachUser.firstName} ${currentSelected.coachUser.lastName}`
        )
      }
    } else {
      setSearchQuery('')
    }
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Stack spacing={1.5}>
        <Input
          id={id}
          placeholder="Type to filter coaches by name or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={() => {
            if (!isListVisible) {
              setIsListVisible(true)
              setSearchQuery('')
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    sx={{ p: 0.25, mr: 0.5, color: 'text.secondary' }}
                  >
                    <ClearIcon sx={{ fontSize: '1.125rem' }} />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => setIsListVisible((prev) => !prev)}
                  sx={{ p: 0.25, color: 'text.secondary' }}
                >
                  {isListVisible ? (
                    <KeyboardArrowUpIcon sx={{ fontSize: '1.25rem' }} />
                  ) : (
                    <KeyboardArrowDownIcon sx={{ fontSize: '1.25rem' }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {isListVisible && (
          <Box
            sx={{
              maxHeight: 250,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'background.paper',
            }}
          >
            {isLoading ? (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                justifyContent="center"
                sx={{ py: 4 }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Checking coach availability…
                </Typography>
              </Stack>
            ) : filteredCoachList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No matching coaches found.
              </Typography>
            ) : (
              <List disablePadding>
                {filteredCoachList.map((c) => {
                  const isSelected = selectedCoachId === c.coachUserId
                  return (
                    <ListItemButton
                      key={c.coachUserId}
                      selected={isSelected}
                      onClick={() => handleSelectCoach(c)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        borderLeft: isSelected ? '4px solid' : '4px solid transparent',
                        borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          '&:hover': {
                            bgcolor: 'action.selected',
                          },
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        width="100%"
                        spacing={2}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          sx={{ minWidth: 0, flexGrow: 1 }}
                        >
                          <Avatar
                            src={c.coachUser.avatarUrl}
                            sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                          >
                            {c.coachUser.firstName[0]}
                            {c.coachUser.lastName[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isSelected ? 'primary.main' : 'text.primary',
                              }}
                            >
                              {c.coachUser.firstName} {c.coachUser.lastName}
                              {c.coachUserId === preAssignedCoachId && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color="primary.main"
                                  sx={{ ml: 1, fontWeight: 400 }}
                                >
                                  (pre-assigned)
                                </Typography>
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c.coachUser.email}
                            </Typography>
                            {!c.isAvailable && (c.conflicts?.length ?? 0) > 0 && (
                              <Typography
                                variant="caption"
                                color="error.main"
                                sx={{ display: 'block', fontWeight: 500, mt: 0.5 }}
                              >
                                Conflict: {c.conflicts[0]?.eventName} (
                                {format(new Date(c.conflicts[0]?.startTime), 'h:mm a')})
                              </Typography>
                            )}
                          </Box>
                        </Stack>

                        <Chip
                          label={c.isAvailable ? 'Available' : 'Conflict'}
                          size="small"
                          color={c.isAvailable ? 'success' : 'error'}
                          variant={c.isAvailable ? 'outlined' : 'filled'}
                          sx={{
                            pointerEvents: 'none',
                            minWidth: 70,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Stack>
                    </ListItemButton>
                  )
                })}
              </List>
            )}
          </Box>
        )}
      </Stack>
    </ClickAwayListener>
  )
}
