import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { FileDown, CalendarRange, Users, ClipboardList, GraduationCap, Info } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateFilterModal } from '@/components/shared/form/DateFilterModal'
import type { StatsTimeframe } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { getBaseURL } from '@/lib/axios'

const BASE_URL = getBaseURL()

export function ReportsPage() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const [modalOpen, setModalOpen] = useState(false)

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
      color: '#E87100',
    },
    {
      id: 'performance',
      title: 'Coach Performance Report',
      description:
        'Aggregated analytics per coach showing total bookings, completion rates, and no-show frequency.',
      icon: <Users size={24} />,
      color: '#3A2C41',
    },
    {
      id: 'students',
      title: 'Student Engagement Report',
      description:
        'Analysis of student activity including first/last booking dates and total session volume.',
      icon: <GraduationCap size={24} />,
      color: '#2E8AEE',
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
            borderRadius: 2,
            bgcolor: 'grey.50',
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
                p: 1,
                bgcolor: 'primary.light',
                borderRadius: 1.5,
                color: 'primary.main',
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
            sx={{ borderRadius: 2, height: 38 }}
          >
            Change Range
          </Button>
        </Card>

        {/* Report Cards Grid */}
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
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: report.color,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ p: 3, flex: 1 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${report.color}15`,
                      color: report.color,
                      display: 'flex',
                    }}
                  >
                    {report.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {report.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {report.description}
                </Typography>
              </Box>
              <Box
                sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<FileDown size={18} />}
                  onClick={() => handleDownload(report.id as any)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: report.color,
                    '&:hover': { bgcolor: report.color, filter: 'brightness(0.9)' },
                  }}
                >
                  Download CSV
                </Button>
              </Box>
            </Card>
          ))}
        </Box>

        {/* Info Box */}
        <Card
          variant="outlined"
          sx={{ mt: 6, p: 3, borderRadius: 2, borderStyle: 'dashed', bgcolor: 'transparent' }}
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
