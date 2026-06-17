import type { EventGroup } from '@/types'

/**
 * Resolves the helper/description text shown beside the group selector for the
 * currently selected tab. `all` and `ungrouped` use fixed copy; a real group
 * falls back to a placeholder when it has no description.
 */
export function getGroupDescription(selectedTab: string, currentGroup: EventGroup | null): string {
  if (selectedTab === 'all') {
    return 'All events configured for this team are listed below. Use the dropdown above to filter events by a specific group category or manage group options.'
  }
  if (selectedTab === 'ungrouped') {
    return 'These events are not assigned to any group. Edit an event to assign it to a group or move it between groups.'
  }
  return (
    currentGroup?.description ||
    'No description provided for this group. Click "Rename" to add a description or change its settings.'
  )
}
