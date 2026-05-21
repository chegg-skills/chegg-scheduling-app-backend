import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import IconButton from '@mui/material/IconButton'
import PublicIcon from '@mui/icons-material/Public'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ClearIcon from '@mui/icons-material/Clear'
import { useTimezones } from '@/hooks/queries/useConfig'
import { getTimezoneInfo, GROUP_ORDER } from '@/components/users/userSystemFieldUtils'

interface PublicTimezoneSelectProps {
  value: string
  onChange: (value: string) => void
}

const filterOptions = createFilterOptions<any>({
  stringify: (option) => `${option.label} ${option.iana} ${option.time}`,
})

// Deprecated IANA names that browsers may still return via resolvedOptions().timeZone.
// These are checked before offset-based matching to avoid collisions between zones
// that share the same UTC offset (e.g. Asia/Calcutta and Asia/Colombo are both UTC+5:30).
const IANA_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
}

export function PublicTimezoneSelect({ value, onChange }: PublicTimezoneSelectProps) {
  const { data: timezones = [] } = useTimezones()
  const [now, setNow] = useState(new Date())

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [inputValue, setInputValue] = useState('')
  const open = Boolean(anchorEl)

  useEffect(() => {
    if (open) return

    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [open])

  // Normalize deprecated/alias IANA values (e.g. Asia/Calcutta → Asia/Kolkata) once the
  // curated list loads. Explicit alias map runs first; offset matching is the fallback for
  // zones not covered by the map, avoiding same-offset collisions (e.g. Colombo vs Kolkata).
  useEffect(() => {
    if (!timezones.length || !value) return
    if (timezones.some((tz) => tz.iana === value)) return

    // 1. Explicit alias map — precise, no offset collision risk
    const aliasTarget = IANA_ALIASES[value]
    if (aliasTarget && timezones.some((tz) => tz.iana === aliasTarget)) {
      onChange(aliasTarget)
      return
    }

    // 2. Offset-based fallback for any other unlisted zone
    try {
      const ref = new Date()
      const getOffsetMs = (iana: string) => {
        const utc = new Date(ref.toLocaleString('en-US', { timeZone: 'UTC' }))
        const local = new Date(ref.toLocaleString('en-US', { timeZone: iana }))
        return local.getTime() - utc.getTime()
      }
      const targetOffset = getOffsetMs(value)
      const match = timezones.find((tz) => {
        try {
          return getOffsetMs(tz.iana) === targetOffset
        } catch {
          return false
        }
      })
      if (match) onChange(match.iana)
    } catch {
      // leave value as-is if offset detection fails
    }
  }, [timezones.length, value]) // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => {
    return timezones
      .filter((tz) => typeof tz === 'object' && tz !== null)
      .map((tz) => ({
        ...tz,
        time: getTimezoneInfo(tz.iana, now).time,
      }))
      .sort((a, b) => {
        const indexA = GROUP_ORDER.indexOf(a.group)
        const indexB = GROUP_ORDER.indexOf(b.group)
        const valA = indexA === -1 ? 99 : indexA
        const valB = indexB === -1 ? 99 : indexB
        if (valA !== valB) return valA - valB
        return a.label.localeCompare(b.label)
      })
  }, [timezones, now])

  const selectedOption = useMemo(
    () => options.find((opt) => opt.iana === value) || null,
    [options, value]
  )

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNow(new Date())
    setInputValue('')
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setInputValue('')
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="text"
        sx={{
          display: 'flex',
          alignItems: 'center',
          textTransform: 'none',
          color: 'text.secondary',
          p: 0.5,
          px: 1,
          ml: -1,
          borderRadius: 1.5,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <PublicIcon sx={{ fontSize: '1.125rem', mr: 0.75, color: 'text.secondary' }} />
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, mr: 0.5, display: { xs: 'none', sm: 'inline' } }}
        >
          Viewing slots in:
        </Typography>
        <Typography
          className="timezone-text"
          variant="caption"
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          {selectedOption ? `${selectedOption.label} - ${selectedOption.time}` : 'Loading...'}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: '1rem', ml: 0.5, color: 'primary.main' }} />
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        sx={{ mt: -1 }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Autocomplete
          open={true}
          value={selectedOption}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => {
            setInputValue(newInputValue)
          }}
          onChange={(_, newValue) => {
            if (newValue) {
              onChange(newValue.iana)
              handleClose()
            }
          }}
          onClose={(_, reason) => {
            if (reason === 'escape') {
              handleClose()
            }
          }}
          options={options}
          filterOptions={filterOptions}
          groupBy={(option) => option.group}
          getOptionLabel={(option) => `${option.label} - ${option.time}`}
          disableClearable
          disablePortal
          size="small"
          slots={{
            popper: (props: any) => <Box sx={{ width: '100%' }}>{props.children}</Box>,
            paper: (props: any) => <Box sx={{ m: 0, boxShadow: 'none' }}>{props.children}</Box>,
          }}
          slotProps={{
            listbox: {
              style: {
                maxHeight: 300,
                padding: 0,
              },
            },
          }}
          renderInput={(params) => (
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search timezone..."
                autoFocus
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <SearchIcon
                      sx={{ fontSize: '1.125rem', color: 'text.secondary', mr: 1, ml: 0.5 }}
                    />
                  ),
                  endAdornment: inputValue ? (
                    <IconButton
                      size="small"
                      onClick={() => setInputValue('')}
                      sx={{ p: 0.25, mr: 0.5, color: 'text.secondary' }}
                    >
                      <ClearIcon sx={{ fontSize: '1.125rem' }} />
                    </IconButton>
                  ) : null,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    '& fieldset': { border: 'none' },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '0.8125rem',
                    p: '6px 0 !important',
                  },
                }}
              />
            </Box>
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props as any
            return (
              <Box component="li" key={key} {...otherProps} sx={{ py: 1, px: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {option.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ ml: 2, color: 'primary.main', fontWeight: 600 }}
                  >
                    {option.time}
                  </Typography>
                </Box>
              </Box>
            )
          }}
          renderGroup={(params) => (
            <li key={params.key}>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 0.5,
                  bgcolor: 'background.default',
                  color: 'text.disabled',
                  fontWeight: 800,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {params.group}
              </Typography>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          )}
        />
      </Popover>
    </>
  )
}
