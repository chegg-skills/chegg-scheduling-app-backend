import { TimezoneSelect } from '@/components/shared/form/TimezoneSelect'

interface PublicTimezoneSelectProps {
  value: string
  onChange: (value: string) => void
}

export function PublicTimezoneSelect({ value, onChange }: PublicTimezoneSelectProps) {
  return <TimezoneSelect value={value} onChange={onChange} variant="public" />
}
