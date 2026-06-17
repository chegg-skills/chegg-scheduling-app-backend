import { Badge, type BadgeColor } from '@/components/shared/ui/Badge'
import type { InviteStatus } from '@/types'

const STATUS_CONFIG: Record<InviteStatus, { label: string; color: BadgeColor }> = {
  PENDING: { label: 'Pending', color: 'yellow' },
  ACCEPTED: { label: 'Accepted', color: 'green' },
  EXPIRED: { label: 'Expired', color: 'red' },
  REVOKED: { label: 'Revoked', color: 'gray' },
}

export function InviteStatusBadge({ status }: { status: InviteStatus }) {
  const { label, color } = STATUS_CONFIG[status]
  return <Badge label={label} color={color} variant="soft" />
}
