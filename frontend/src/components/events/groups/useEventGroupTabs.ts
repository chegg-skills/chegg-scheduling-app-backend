import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Event, EventGroup } from '@/types'

export interface TabItem {
  id: string
  name: string
  count: number
  color: string | null
  rawGroup: EventGroup | null
}

export function useEventGroupTabs(groups: EventGroup[], events: Event[], teamId: string) {
  void teamId // consumed by parent URL (/teams/:teamId) — group resets naturally on team navigation

  const [searchParams, setSearchParams] = useSearchParams()
  const rawGroupParam = searchParams.get('group') ?? 'all'

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

  // Validate URL param against current tabs; deleted groups fall back to 'all' automatically
  const selectedTab = useMemo(
    () => (tabs.some((t) => t.id === rawGroupParam) ? rawGroupParam : 'all'),
    [rawGroupParam, tabs]
  )

  const setSelectedTab = useCallback(
    (tabId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (tabId === 'all') next.delete('group')
          else next.set('group', tabId)
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

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
