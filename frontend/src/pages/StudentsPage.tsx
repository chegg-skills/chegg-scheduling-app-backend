import { useState, useEffect } from 'react'
import { Box, InputAdornment, IconButton } from '@mui/material'
import { Search, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Input } from '@/components/shared/Input'
import { Pagination } from '@/components/shared/Pagination'
import { StudentTable } from '@/components/students/StudentTable'
import { useStudents } from '@/hooks/useStudents'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const PAGE_SIZE = 25

export function StudentsPage() {
    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const debouncedSearch = useDebouncedValue(searchInput, 250)

    useEffect(() => {
        setPage(1)
    }, [debouncedSearch])

    const { data, isLoading, error } = useStudents({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
    })

    if (isLoading && !data) return <PageSpinner />
    if (error) return <ErrorAlert message="Failed to load students." />

    return (
        <Box>
            <PageHeader
                title="Students"
                subtitle={`${data?.pagination.total ?? 0} total students`}
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
                    <StudentTable students={data?.students ?? []} />
                </Box>

                {data && data.pagination.totalPages > 1 && (
                    <Box sx={{ mt: 3 }}>
                        <Pagination
                            page={page}
                            totalPages={data.pagination.totalPages}
                            total={data.pagination.total}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    )
}
