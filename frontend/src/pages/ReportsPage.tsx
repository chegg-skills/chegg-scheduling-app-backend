import { useState, useMemo } from 'react'
import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import TableSortLabel from '@mui/material/TableSortLabel'
import {
  FileDown,
  CalendarRange,
  Users,
  ClipboardList,
  GraduationCap,
  Info,
  ArrowLeft,
  Search,
  X,
  Eye,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateFilterModal } from '@/components/shared/form/DateFilterModal'
import type { StatsTimeframe } from '@/types'
import { useAuth } from '@/context/auth/useAuth'
import { getBaseURL } from '@/lib/axios'
import {
  useBookingsReport,
  usePerformanceReport,
  useStudentReport,
} from '@/hooks/queries/useReports'

const BASE_URL = getBaseURL()

const formatCellValue = (key: string, value: any) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  const keyLower = key.toLowerCase()
  if (keyLower.includes('date') || keyLower.includes('time')) {
    try {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      }
    } catch {
      // fallback
    }
  }
  return String(value)
}

const formatStatusText = (status: string) => {
  if (!status) return '-'
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return 'Confirmed'
    case 'COMPLETED':
      return 'Present'
    case 'NO_SHOW':
      return 'Absent'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

interface ReportViewerProps {
  reportType: 'bookings' | 'performance' | 'students'
  timeframe: StatsTimeframe
  onClose: () => void
  reportColor: string
  reportTitle: string
}

function ReportViewer({
  reportType,
  timeframe,
  onClose,
  reportColor,
  reportTitle,
}: ReportViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [orderBy, setOrderBy] = useState<string | null>(null)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const bookingsQuery = useBookingsReport(timeframe)
  const performanceQuery = usePerformanceReport(timeframe)
  const studentsQuery = useStudentReport(timeframe)

  let activeQuery = bookingsQuery
  if (reportType === 'performance') {
    activeQuery = performanceQuery
  } else if (reportType === 'students') {
    activeQuery = studentsQuery
  }

  const { data = [], isLoading, error } = activeQuery

  const filteredData = useMemo(() => {
    return data.filter((row: any) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [data, searchQuery])

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData
    return [...filteredData].sort((a, b) => {
      const valA = a[orderBy]
      const valB = b[orderBy]

      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA
      }

      const dateA = Date.parse(valA)
      const dateB = Date.parse(valB)
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return order === 'asc' ? dateA - dateB : dateB - dateA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [filteredData, orderBy, order])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(0)
  }

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
        <CircularProgress sx={{ color: reportColor }} />
        <Typography variant="body2" color="text.secondary">
          Loading report data...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: 'error.lighter',
          borderRadius: 2,
          color: 'error.main',
        }}
      >
        <Typography variant="h6">Failed to load report data</Typography>
        <Typography variant="body2">
          {(error as any)?.message || 'Unknown error occurred.'}
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => activeQuery.refetch()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    )
  }

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const headers = data.length > 0 ? Object.keys(data[0]) : []

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          bgcolor: 'background.paper',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            onClick={onClose}
            startIcon={<ArrowLeft size={16} />}
            sx={{
              borderRadius: 2,
              borderColor: 'divider',
              color: 'text.primary',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
            }}
          >
            Back
          </Button>
          <Box sx={{ borderLeft: '3px solid', borderColor: reportColor, pl: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {reportTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inline Data Preview
            </Typography>
          </Box>
        </Stack>
        <TextField
          size="small"
          placeholder="Search report data..."
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{
            width: { xs: '100%', sm: 300 },
            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  backgroundColor: (theme: any) =>
                    theme.palette.mode === 'dark'
                      ? theme.palette.grey[900]
                      : theme.palette.grey[100],
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  width: 50,
                  textAlign: 'center',
                  py: 1.5,
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                }}
              >
                #
              </TableCell>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: (theme: any) =>
                      theme.palette.mode === 'dark'
                        ? theme.palette.grey[900]
                        : theme.palette.grey[100],
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    py: 1.5,
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderRight: 0 },
                  }}
                >
                  <TableSortLabel
                    active={orderBy === header}
                    direction={orderBy === header ? order : 'asc'}
                    onClick={() => handleRequestSort(header)}
                    sx={{
                      '& .MuiTableSortLabel-icon': {
                        color: 'text.secondary',
                      },
                    }}
                  >
                    {header}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(headers.length || 1) + 1} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No matching records found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row: any, idx: number) => (
                <TableRow
                  key={idx}
                  hover
                  sx={{
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      backgroundColor: (theme: any) =>
                        theme.palette.mode === 'dark'
                          ? theme.palette.grey[900]
                          : theme.palette.grey[100],
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      py: 1.75,
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {page * rowsPerPage + idx + 1}
                  </TableCell>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        py: 1.75,
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderRight: 0 },
                      }}
                    >
                      {header === 'Status'
                        ? formatStatusText(row[header])
                        : formatCellValue(header, row[header])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </Card>
  )
}

export function ReportsPage() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeReportId, setActiveReportId] = useState<
    'bookings' | 'performance' | 'students' | null
  >(null)

  // Helper to format the timeframe label for display
  const getTimeframeLabel = (tf: StatsTimeframe) => {
    if (tf.startsWith('custom:')) {
      const parts = tf.split(':')
      return `${parts[1]} to ${parts[2]}`
    }
    return tf.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
  }

  const handleDownload = (reportType: 'bookings' | 'performance' | 'students') => {
    const url = `${BASE_URL}/v1/reports/${reportType}?timeframe=${timeframe}`
    window.open(url, '_blank')
  }

  const reports = [
    {
      id: 'bookings',
      title: 'Bookings Master Report',
      description:
        'Full lifecycle data for all sessions including coach, student, status, and custom session details.',
      icon: <ClipboardList size={24} />,
      color: 'primary.main',
      bg: (theme: any) => alpha(theme.palette.primary.main, 0.08),
    },
    {
      id: 'performance',
      title: 'Coach Performance Report',
      description:
        'Aggregated analytics per coach showing total bookings, completion rates, and no-show frequency.',
      icon: <Users size={24} />,
      color: 'secondary.main',
      bg: (theme: any) => alpha(theme.palette.secondary.main, 0.08),
    },
    {
      id: 'students',
      title: 'Student Engagement Report',
      description:
        'Analysis of student activity including first/last booking dates and total session volume.',
      icon: <GraduationCap size={24} />,
      color: 'info.main',
      bg: (theme: any) => alpha(theme.palette.info.main, 0.08),
    },
  ]

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'TEAM_ADMIN')) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Access Denied</Typography>
        <Typography color="text.secondary">You do not have permission to view reports.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Reports & Insights"
        subtitle="Export high-fidelity system data for offline analysis and organizational auditing."
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        {/* Global Controls */}
        <Card
          variant="outlined"
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                p: 1.25,
                bgcolor: 'primary.light',
                borderRadius: 2,
                color: 'primary.dark',
                display: 'flex',
              }}
            >
              <CalendarRange size={20} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Report Timeframe
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getTimeframeLabel(timeframe)}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            onClick={() => setModalOpen(true)}
            startIcon={<CalendarRange size={16} />}
            sx={{ borderRadius: 2, height: 38, fontWeight: 600 }}
          >
            Change Range
          </Button>
        </Card>

        {/* Report Cards Grid or Dynamic Viewer */}
        {activeReportId ? (
          <ReportViewer
            reportType={activeReportId}
            timeframe={timeframe}
            onClose={() => setActiveReportId(null)}
            reportColor={reports.find((r) => r.id === activeReportId)?.color || 'primary.main'}
            reportTitle={reports.find((r) => r.id === activeReportId)?.title || ''}
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
            }}
          >
            {reports.map((report) => (
              <Card
                key={report.id}
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 1.5,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: report.color,
                    boxShadow: (theme) => `0 12px 24px -8px ${alpha(theme.palette.divider, 0.4)}`,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box sx={{ p: 3, flex: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: report.bg,
                        color: report.color,
                        display: 'flex',
                      }}
                    >
                      {report.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.5 }}>
                      {report.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    {report.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<FileDown size={16} />}
                      onClick={() => handleDownload(report.id as any)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: report.color,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        py: 1,
                        '&:hover': { bgcolor: report.color, filter: 'brightness(0.9)' },
                      }}
                    >
                      Download
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Eye size={16} />}
                      onClick={() => setActiveReportId(report.id as any)}
                      sx={{
                        borderRadius: 2,
                        borderColor: report.color,
                        color: report.color,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        py: 1,
                        '&:hover': {
                          borderColor: report.color,
                          bgcolor: (theme: any) => {
                            const c = report.color.split('.')[0]
                            const paletteColor =
                              (theme.palette as any)[c]?.main || theme.palette.primary.main
                            return alpha(paletteColor, 0.04)
                          },
                        },
                      }}
                    >
                      View in App
                    </Button>
                  </Stack>
                </Box>
              </Card>
            ))}
          </Box>
        )}

        {/* Info Box */}
        <Card
          variant="outlined"
          sx={{ mt: 6, p: 3, borderRadius: 1.5, borderStyle: 'dashed', bgcolor: 'transparent' }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Info size={20} color="#525252" />
            <Typography variant="body2" color="text.secondary">
              Generated reports are scoped to your administrative permissions. **Team Admins** will
              only export data for their assigned teams.
            </Typography>
          </Stack>
        </Card>
      </Box>

      <DateFilterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentValue={timeframe}
        onChange={setTimeframe}
      />
    </Box>
  )
}
