import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import PublicIcon from '@mui/icons-material/Public'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTimezones } from '@/hooks/queries/useConfig'
import { getTimezoneInfo } from '@/components/users/userSystemFieldUtils'

interface PublicTimezoneSelectProps {
  value: string
  onChange: (value: string) => void
}

const filterOptions = createFilterOptions<any>({
  stringify: (option) => `${option.name} ${option.rawTz} ${option.time}`,
})

export function PublicTimezoneSelect({ value, onChange }: PublicTimezoneSelectProps) {
  const { data: timezones = [] } = useTimezones()
  const [now, setNow] = useState(new Date())
  
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const open = Boolean(anchorEl)

  useEffect(() => {
    if (open) return
    
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [open])

  const options = useMemo(() => {
    return timezones
      .filter((tz): tz is string => typeof tz === 'string')
      .map((tz) => {
        const info = getTimezoneInfo(tz, now)
        const region = tz.includes('/') ? tz.split('/')[0].replace(/_/g, ' ') : 'Universal'
        return {
          id: tz,
          label: `${info.name} - ${info.time}`,
          name: info.name,
          rawTz: tz.replace(/_/g, ' '),
          time: info.time,
          region,
        }
      })
  }, [timezones, now])

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) || null,
    [options, value]
  )

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNow(new Date())
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
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
        <Typography variant="caption" sx={{ fontWeight: 600, mr: 0.5, display: { xs: 'none', sm: 'inline' } }}>
          Viewing slots in:
        </Typography>
        <Typography className="timezone-text" variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {selectedOption?.label || 'Loading...'}
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
        sx={{ mt: -1}}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
            }
          }
        }}
      >
        <Autocomplete
          open={true}
          value={selectedOption}
          onChange={(_, newValue) => {
            if (newValue) {
              onChange(newValue.id)
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
          groupBy={(option) => option.region}
          getOptionLabel={(option) => option.label}
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
            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search timezone..."
                autoFocus
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary', mr: 1, ml: 0.5 }} />
                  ),
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
            const { key, ...otherProps } = props as any;
            return (
              <Box component="li" key={key} {...otherProps} sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 2, color: 'primary.main', fontWeight: 600 }}>
                    {option.time}
                  </Typography>
                </Box>
              </Box>
            );
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
