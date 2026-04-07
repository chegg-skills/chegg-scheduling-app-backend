import { useState, useCallback } from 'react'

export interface UsePaginationReturn {
    page: number
    pageSize: number
    backendPage: number
    onPageChange: (newPage: number) => void
    onRowsPerPageChange: (newSize: number) => void
    resetPage: () => void
}

/**
 * Custom hook to manage pagination state for MUI TablePagination
 * Handles the mapping between 0-indexed MUI and 1-indexed Backend
 */
export function usePagination(initialPageSize = 25): UsePaginationReturn {
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(initialPageSize)

    const onPageChange = useCallback((newPage: number) => {
        setPage(newPage)
    }, [])

    const onRowsPerPageChange = useCallback((newSize: number) => {
        setPageSize(newSize)
        setPage(0)
    }, [])

    const resetPage = useCallback(() => {
        setPage(0)
    }, [])

    return {
        page,
        pageSize,
        backendPage: page + 1,
        onPageChange,
        onRowsPerPageChange,
        resetPage,
    }
}
