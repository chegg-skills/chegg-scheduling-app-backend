import { useMemo, useState } from 'react'

export type TableSortDirection = 'asc' | 'desc'
export type SortValue = string | number | boolean | Date | null | undefined
export type SortAccessorMap<T, K extends string> = Record<K, (item: T) => SortValue>

export interface TableSortConfig<K extends string> {
  key: K
  direction: TableSortDirection
}

const compareValues = (
  left: Exclude<SortValue, null | undefined>,
  right: Exclude<SortValue, null | undefined>
) => {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime()
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right)
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function useTableSort<T, K extends string>(
  items: T[],
  sortAccessors: SortAccessorMap<T, K>,
  initialSort?: TableSortConfig<K>
) {
  const [sortConfig, setSortConfig] = useState<TableSortConfig<K> | null>(initialSort ?? null)

  const sortedItems = useMemo(() => {
    if (!sortConfig) {
      return items
    }

    const accessor = sortAccessors[sortConfig.key]
    if (!accessor) {
      return items
    }

    return items
      .map((item, index) => ({ item, index }))
      .sort((leftEntry, rightEntry) => {
        const leftValue = accessor(leftEntry.item)
        const rightValue = accessor(rightEntry.item)

        if (leftValue == null && rightValue == null) {
          return leftEntry.index - rightEntry.index
        }

        if (leftValue == null) {
          return 1
        }

        if (rightValue == null) {
          return -1
        }

        const comparison = compareValues(leftValue, rightValue)
        if (comparison === 0) {
          return leftEntry.index - rightEntry.index
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
      .map(({ item }) => item)
  }, [items, sortAccessors, sortConfig])

  const requestSort = (key: K) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key,
        direction: 'asc',
      }
    })
  }

  return {
    sortedItems,
    sortConfig,
    requestSort,
  }
}
