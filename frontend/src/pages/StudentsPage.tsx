import { useState, useEffect } from 'react'
import { Box, InputAdornment, IconButton } from '@mui/material'
import { Search, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Input } from '@/components/shared/Input'
import { StudentTable } from '@/components/students/StudentTable'
import { useStudents } from '@/hooks/useStudents'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function StudentsPage() {
    const [page, setPage] = useState(0) // 0-indexed for MUI
    const [pageSize, setPageSize] = useState(25)
    const [searchInput, setSearchInput] = useState('')
    const debouncedSearch = useDebouncedValue(searchInput, 250)

    useEffect(() => {
        setPage(0)
    }, [debouncedSearch])

    const { data, isLoading, error } = useStudents({
        page: page + 1, // backend is 1-indexed
        pageSize,
        search: debouncedSearch.trim() || undefined,
    })

    const students = data?.students ?? []
    const pagination = data?.pagination

    if (isLoading && !data) return <PageSpinner />
    if (error) return <ErrorAlert message="Failed to load students." />

    return (
        <Box>
            <PageHeader
                title="Students"
                subtitle={`${pagination?.total ?? 0} total students`}
                actions={
                    <Box sx={{ width: { xs: '100%', sm: 360 }, maxWidth: 360 }}>
                        <Input
                            isSearch
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by name or email"
                            aria-label="Search students"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={16} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchInput ? (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="Clear student search"
                                            edge="end"
                                            size="small"
                                            onClick={() => setSearchInput('')}
                                        >
                                            <X size={14} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                    </Box>
                }
            />

            <Box sx={{ px: { xs: 2.5, md: 4 } }}>
                <Box sx={{ mt: 1 }}>
                    <StudentTable
                        students={students}
                        pagination={pagination}
                        onPageChange={setPage}
                        onRowsPerPageChange={(val) => {
                            setPageSize(val)
                            setPage(0)
                        }}
                    />
                </Box>
            </Box>
        </Box>
    )
}
