import { useParams } from 'react-router-dom'
import { Box, Stack } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { StudentProfileCard } from '@/components/students/StudentProfileCard'
import { StudentBookingHistory } from '@/components/students/StudentBookingHistory'
import { useStudent, useStudentBookings } from '@/hooks/useStudents'

export function StudentDetailPage() {
    const { studentId } = useParams<{ studentId: string }>()

    const { data: student, isLoading: studentLoading, error: studentError } = useStudent(studentId!)
    const { data: bookingsData, isLoading: bookingsLoading } = useStudentBookings(studentId!)

    if (studentLoading) return <PageSpinner />
    if (studentError || !student) return <ErrorAlert message="Student not found." />

    return (
        <Box>
            <PageHeader
                title={toTitleCase(student.fullName)}
                subtitle={student.email}
                backTo="/students"
                backLabel="Students"
            />

            <Stack spacing={4} sx={{ px: { xs: 2.5, md: 4 }, pb: 6 }}>
                <StudentProfileCard student={student} />

                <Box sx={{ mt: 2 }}>
                    {bookingsLoading && !bookingsData ? (
                        <PageSpinner />
                    ) : (
                        <StudentBookingHistory
                            bookings={bookingsData?.bookings ?? []}
                        />
                    )}
                </Box>
            </Stack>
        </Box>
    )
}
