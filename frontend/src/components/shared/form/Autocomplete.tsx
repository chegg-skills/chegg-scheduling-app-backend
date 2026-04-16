import MuiAutocomplete, {
  AutocompleteProps as MuiAutocompleteProps,
} from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { styled } from '@mui/material/styles'

const StyledAutocomplete = styled(MuiAutocomplete)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    padding: '2px 9px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '& fieldset': {
      borderColor: '#e0e0e0',
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '1px',
    },
  },
})) as typeof MuiAutocomplete

interface AutocompleteProps<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined,
> extends Omit<MuiAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>, 'renderInput'> {
  label?: string
  error?: boolean
  helperText?: string
  placeholder?: string
  required?: boolean
  name?: string
}

export function Autocomplete<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined,
>({
  label,
  error,
  helperText,
  placeholder,
  required,
  name,
  ...props
}: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return (
    <StyledAutocomplete
      {...props}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
          fullWidth
          size="small"
        />
      )}
    />
  )
}
