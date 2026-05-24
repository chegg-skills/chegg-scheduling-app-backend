import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Stack, Tabs, Tab } from '@mui/material'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { StudentBookingHistory } from '@/components/students/StudentBookingHistory'
import { StudentBookingStats } from '@/components/students/StudentBookingStats'
import { StudentProfileCard } from '@/components/students/StudentProfileCard'
import { StudentSessionLogTimeline } from '@/components/students/StudentSessionLogTimeline'
import { SendEmailDialog } from '@/components/students/dialogs/SendEmailDialog'
import { StudentCommunicationsTab } from '@/components/students/tabs/StudentCommunicationsTab'
import { useStudent, useStudentBookings } from '@/hooks/queries/useStudents'
import { CalendarDays, ClipboardCheck, Mail } from 'lucide-react'

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const [activeTab, setActiveTab] = useState<'notes' | 'bookings' | 'communications'>('notes')
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const { data: student, isLoading: studentLoading, error: studentError } = useStudent(studentId!)
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useStudentBookings(studentId!)

  if (studentLoading) return <PageSpinner />
  if (studentError || !student) {
    return (
      <Box>
        <PageHeader title="Student" breadcrumbs={[{ label: 'Students', to: '/students' }]} />
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: 4 }}>
          <ErrorAlert message="Student not found or failed to load. Please go back and try again." />
        </Box>
      </Box>
    )
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'notes' | 'bookings' | 'communications') => {
    setActiveTab(newValue)
  }

  return (
    <Box>
      <PageHeader title="Student Profile" breadcrumbs={[{ label: 'Students', to: '/students' }]} />

      <Stack spacing={4} sx={{ px: { xs: 2.5, md: 4 }, pb: 6 }}>
        <StudentProfileCard
          student={student}
          bookings={bookingsData?.bookings ?? []}
          onSendEmail={() => setEmailDialogOpen(true)}
        />

        <SendEmailDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          studentId={student.id}
          studentName={student.fullName}
          studentEmail={student.email}
        />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="student profile tabs"
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
              label="Session Logs & Notes"
              value="notes"
              icon={<ClipboardCheck size={18} />}
              iconPosition="start"
            />
            <Tab
              label="Booking History"
              value="bookings"
              icon={<CalendarDays size={18} />}
              iconPosition="start"
            />
            <Tab
              label="Communications"
              value="communications"
              icon={<Mail size={18} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {activeTab === 'notes' && (
          <StudentSessionLogTimeline studentId={studentId!} />
        )}

        {activeTab === 'bookings' && (
          <Stack spacing={4}>
            <StudentBookingStats
              bookings={bookingsData?.bookings ?? []}
              totalCount={student.bookingCount}
            />

            <Box>
              {bookingsLoading && !bookingsData ? (
                <PageSpinner />
              ) : bookingsError ? (
                <ErrorAlert message="Failed to load session history. Please refresh the page." />
              ) : (
                <StudentBookingHistory bookings={bookingsData?.bookings ?? []} />
              )}
            </Box>
          </Stack>
        )}

        {activeTab === 'communications' && (
          <StudentCommunicationsTab studentId={studentId!} />
        )}
      </Stack>
    </Box>
  )
}
