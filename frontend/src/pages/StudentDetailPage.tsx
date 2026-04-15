import { useParams } from 'react-router-dom'
import { Box, Stack, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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
            <Box sx={{ px: { xs: 2.5, md: 4 }, pt: 3, pb: 1 }}>
                <Breadcrumbs
                    separator={<ChevronRight size={14} />}
                    aria-label="breadcrumb"
                    sx={{ mb: 2 }}
                >
                    <MuiLink
                        component={Link}
                        to="/students"
                        underline="hover"
                        color="inherit"
                        sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                        Students
                    </MuiLink>
                    <Typography color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {toTitleCase(student.fullName)}
                    </Typography>
                </Breadcrumbs>
            </Box>

            <PageHeader
                title={toTitleCase(student.fullName)}
                subtitle={student.email}
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
