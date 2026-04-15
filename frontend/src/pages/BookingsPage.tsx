import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { useMemo } from 'react'
import { alpha, useTheme } from '@mui/material/styles'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  X,
  SlidersHorizontal,
  LayoutList,
  Calendar as CalendarIcon,
  GraduationCap,
  UsersRound,
} from 'lucide-react'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { BookingTable } from '@/components/bookings/BookingTable'
import { BookingCalendar } from '@/components/bookings/BookingCalendar'
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal'
import { BookingFilterDialog } from '@/components/bookings/filters/BookingFilterDialog'
import { useBookings } from '@/hooks/useBookings'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { Input } from '@/components/shared/Input'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useBookingStats } from '@/hooks/useStats'
import { useBookingFilters } from '@/hooks/useBookingFilters'
import { Badge, Button as MuiButton } from '@mui/material'
import type { Booking } from '@/types'
import { useState } from 'react'

export function BookingsPage() {
  const theme = useTheme()
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const {
    statusFilter,
    searchInput,
    setSearchInput,
    advancedFilters,
    setAdvancedFilters,
    isFilterDialogOpen,
    setIsFilterDialogOpen,
    serverFilters,
    handleTabChange,
    handleFilterChange,
    handleResetFilters,
    activeFilterCount,
    viewMode,
    setViewMode,
    timeframe,
    setTimeframe,
    onPageChange,
    onRowsPerPageChange,
  } = useBookingFilters()

  const { data: bookingStats, isLoading: statsLoading } = useBookingStats(timeframe)
  const { data, isLoading, error } = useBookings(serverFilters)

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings])
  const pagination = data?.pagination

  const filteredBookings = useMemo(() => {
    let result = bookings
    if (statusFilter === 'UPCOMING') {
      const now = new Date()
      result = bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.startTime) >= now)
    }
    return [...result].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }, [bookings, statusFilter])

  const bookingStatItems = [
    {
      label: 'Scheduled',
      value: bookingStats?.metrics.totalBookings ?? 0,
      helperText: 'Bookings inside the selected time frame',
      icon: <CalendarDays size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Upcoming',
      value: bookingStats?.metrics.upcomingBookings ?? 0,
      helperText: 'Confirmed sessions still ahead',
      icon: <Clock3 size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Top Coach',
      value: bookingStats?.metrics.mostBookedCoach?.name ?? 'N/A',
      helperText: bookingStats?.metrics.mostBookedCoach
        ? `${bookingStats.metrics.mostBookedCoach.count} bookings assigned`
        : 'No coach metrics',
      icon: <GraduationCap size={18} />,
      accent: 'purple' as const,
    },
    {
      label: 'Top Team',
      value: bookingStats?.metrics.mostBookedTeam?.name ?? 'N/A',
      helperText: bookingStats?.metrics.mostBookedTeam
        ? `${bookingStats.metrics.mostBookedTeam.count} team bookings`
        : 'No team metrics',
      icon: <UsersRound size={18} />,
      accent: 'green' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Bookings"
        subtitle="Manage your scheduled sessions and meetings"
        actions={
          <Box
            sx={{
              width: { xs: '100%', sm: 420 },
              maxWidth: 420,
              height: 40,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Input
              isSearch
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or booking ID"
              aria-label="Search bookings"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Clear search"
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
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={bookingStats?.timeframe}
          items={bookingStatItems}
          isLoading={statsLoading}
        />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            mt: 4,
            mb: 3,
          }}
        >
          <Tabs
            value={statusFilter}
            onChange={handleTabChange}
            aria-label="booking filters"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
            }}
          >
            <Tab
              label="Upcoming"
              value="UPCOMING"
              icon={<Clock3 size={18} />}
              iconPosition="start"
            />
            <Tab label="All" value="ALL" icon={<CalendarDays size={18} />} iconPosition="start" />
            <Tab label="Cancelled" value="CANCELLED" icon={<X size={18} />} iconPosition="start" />
            <Tab
              label="Completed"
              value="COMPLETED"
              icon={<CheckCircle2 size={18} />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next) => next && setViewMode(next)}
              size="small"
              sx={{
                bgcolor: 'background.paper',
                '& .MuiToggleButton-root': {
                  px: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    },
                  },
                },
              }}
            >
              <ToggleButton value="list">
                <LayoutList size={16} style={{ marginRight: 8 }} />
                List
              </ToggleButton>
              <ToggleButton value="calendar">
                <CalendarIcon size={16} style={{ marginRight: 8 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>

            <Badge
              badgeContent={activeFilterCount}
              color="primary"
              variant="dot"
              invisible={activeFilterCount === 0}
            >
              <MuiButton
                startIcon={<SlidersHorizontal size={18} />}
                onClick={() => setIsFilterDialogOpen(true)}
                variant="outlined"
                color="inherit"
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: 'divider',
                  fontWeight: 600,
                  height: 40,
                  minHeight: 40,
                  maxHeight: 40,
                }}
              >
                Filter
              </MuiButton>
            </Badge>
          </Box>
        </Box>

        <BookingFilterDialog
          open={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)}
          filters={advancedFilters}
          onFilterChange={handleFilterChange}
          onRangeChange={(start, end) => {
            setAdvancedFilters((prev) => ({ ...prev, startDate: start, endDate: end }))
          }}
          onReset={handleResetFilters}
        />

        {isLoading && bookings.length === 0 ? (
          <PageSpinner />
        ) : error ? (
          <ErrorAlert message="Failed to load bookings. Please try again." />
        ) : (
          <Box>
            <Box
              sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Showing {pagination?.total ?? filteredBookings.length} bookings
              </Typography>
            </Box>

            {viewMode === 'list' ? (
              <BookingTable
                bookings={filteredBookings}
                pagination={pagination}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                onViewHost={setViewingUserId}
              />
            ) : (
              <BookingCalendar bookings={filteredBookings} onViewDetail={setSelectedBooking} />
            )}
          </Box>
        )}

        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onViewHost={setViewingUserId}
        />

        {viewingUserId && (
          <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        )}
      </Box>
    </Box>
  )
}
