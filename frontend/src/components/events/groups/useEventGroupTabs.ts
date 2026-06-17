import { useEffect, useMemo, useState } from 'react'
import type { Event, EventGroup } from '@/types'

export interface TabItem {
  id: string
  name: string
  count: number
  color: string | null
  rawGroup: EventGroup | null
}

/**
 * Derives the group filter tabs for a team's events and tracks the selected tab.
 * Encapsulates the events-by-group grouping, the dynamically-built tab list, the
 * active tab resolution, the events shown for the active tab, and the two reset
 * effects (team change, selected-group deletion).
 */
export function useEventGroupTabs(groups: EventGroup[], events: Event[], teamId: string) {
  const [selectedTab, setSelectedTab] = useState<string>('all')

  // Reset tab when team changes
  useEffect(() => {
    setSelectedTab('all')
  }, [teamId])

  const eventsByGroupId = useMemo(() => {
    const map = new Map<string | null, Event[]>()
    for (const event of events) {
      const key = event.groupId ?? null
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  const ungrouped = useMemo(() => eventsByGroupId.get(null) ?? [], [eventsByGroupId])

  // Build the list of available tabs dynamically
  const tabs = useMemo(() => {
    const list: TabItem[] = [
      { id: 'all', name: 'All Events', count: events.length, color: null, rawGroup: null },
    ]
    if (ungrouped.length > 0) {
      list.push({
        id: 'ungrouped',
        name: 'Ungrouped',
        count: ungrouped.length,
        color: null,
        rawGroup: null,
      })
    }
    for (const group of groups) {
      const groupEvents = eventsByGroupId.get(group.id) ?? []
      list.push({
        id: group.id,
        name: group.name,
        count: groupEvents.length,
        color: group.color,
        rawGroup: group,
      })
    }
    return list
  }, [groups, events.length, ungrouped.length, eventsByGroupId])

  // Reset to 'all' if selected group is deleted
  useEffect(() => {
    if (
      selectedTab !== 'all' &&
      selectedTab !== 'ungrouped' &&
      !groups.some((g) => g.id === selectedTab)
    ) {
      setSelectedTab('all')
    }
  }, [groups, selectedTab])

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === selectedTab) ?? tabs[0]
  }, [tabs, selectedTab])

  const displayedEvents = useMemo(() => {
    if (activeTab.id === 'all') return events
    if (activeTab.id === 'ungrouped') return ungrouped
    return eventsByGroupId.get(activeTab.id) ?? []
  }, [activeTab.id, events, ungrouped, eventsByGroupId])

  return { selectedTab, setSelectedTab, tabs, activeTab, displayedEvents }
}
