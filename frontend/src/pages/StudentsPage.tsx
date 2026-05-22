import { useState, useEffect } from 'react'
import { Box, InputAdornment, IconButton, Paper, Typography } from '@mui/material'
import { Search, X, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { Input } from '@/components/shared/form/Input'
import { StudentTable } from '@/components/students/StudentTable'
import { useStudents } from '@/hooks/queries/useStudents'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { alpha } from '@mui/material/styles'

import { usePagination } from '@/hooks/usePagination'

export function StudentsPage() {
  const { isCoach } = usePermissions()
  const { pageSize, backendPage, onPageChange, onRowsPerPageChange, resetPage } = usePagination(25)

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 250)

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, resetPage])

  const { data, isLoading, error } = useStudents({
    page: backendPage,
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
          <Box
            sx={{
              width: { xs: '100%', sm: 360 },
              maxWidth: 360,
              height: 40,
              display: 'flex',
              alignItems: 'center',
            }}
          >
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
          {isCoach && students.length === 0 && !debouncedSearch ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 4, md: 8 },
                textAlign: 'center',
                borderRadius: 3,
                borderStyle: 'dashed',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: 600,
                mx: 'auto',
                mt: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={48} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                Your Student Roster is Ready
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 450, mx: 'auto', mb: 0, lineHeight: 1.6 }}
              >
                No students booked yet. When students book a session from your teams or events, their profiles, contact details, and history will automatically appear here.
              </Typography>
            </Paper>
          ) : (
            <StudentTable
              students={students}
              pagination={pagination}
              onPageChange={onPageChange}
              onRowsPerPageChange={onRowsPerPageChange}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
