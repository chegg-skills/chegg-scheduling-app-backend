import { useState } from 'react'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { ChevronRight, Calendar, Users, Award, CheckCircle2 } from 'lucide-react'
import { usePublicTeams, usePublicTeamEvents, usePublicSlots } from '@/hooks/usePublicBooking'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { bookingsApi } from '@/api/bookings'

const STEPS = ['Category', 'Session', 'Schedule', 'Confirm']

export function PublicBookingPage() {
    const [activeStep, setActiveStep] = useState(0)
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [studentInfo, setStudentInfo] = useState({
        name: '',
        email: '',
        notes: '',
        specificQuestion: '',
        triedSolutions: '',
        usedResources: '',
        sessionObjectives: ''
    })

    const { data: teams = [], isLoading: loadingTeams, error: teamsError } = usePublicTeams()
    const { data: events = [], isLoading: loadingEvents } = usePublicTeamEvents(selectedTeam || '')

    // Use native Date logic instead of date-fns
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).toISOString()

    const { data: slots = [], isLoading: loadingSlots } = usePublicSlots(selectedEvent || '', startDate, endDate)

    const handleNext = () => setActiveStep((prev) => prev + 1)
    const handleBack = () => setActiveStep((prev) => prev - 1)

    const handleBook = async () => {
        if (!selectedTeam || !selectedEvent || !selectedSlot) return;

        try {
            await bookingsApi.create({
                studentName: studentInfo.name,
                studentEmail: studentInfo.email,
                teamId: selectedTeam,
                eventId: selectedEvent,
                startTime: selectedSlot,
                notes: studentInfo.notes,
                specificQuestion: studentInfo.specificQuestion,
                triedSolutions: studentInfo.triedSolutions,
                usedResources: studentInfo.usedResources,
                sessionObjectives: studentInfo.sessionObjectives
            })
            handleNext()
        } catch (err) {
            console.error("Booking failed:", err)
        }
    }

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0: // Team Selection
                if (loadingTeams) return <PageSpinner />
                if (teamsError) return <ErrorAlert message="Failed to load categories." />
                return (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2
                        }}
                    >
                        {teams.map((team) => (
                            <Card
                                key={team.id}
                                variant="outlined"
                                sx={{
                                    borderColor: selectedTeam === team.id ? 'primary.main' : 'divider',
                                    borderWidth: selectedTeam === team.id ? 2 : 1
                                }}
                            >
                                <CardActionArea onClick={() => { setSelectedTeam(team.id); handleNext(); }}>
                                    <CardContent>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.main' }}>
                                                <Users size={24} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h6">{team.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">{team.description}</Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                )

            case 1: // Event Selection
                if (loadingEvents) return <PageSpinner />
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {events.map((event) => (
                            <Card
                                key={event.id}
                                variant="outlined"
                                sx={{
                                    borderColor: selectedEvent === event.id ? 'primary.main' : 'divider',
                                    borderWidth: selectedEvent === event.id ? 2 : 1
                                }}
                            >
                                <CardActionArea onClick={() => { setSelectedEvent(event.id); handleNext(); }}>
                                    <CardContent>
                                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'secondary.light', color: 'secondary.main' }}>
                                                    <Award size={24} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight={600}>{event.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {Math.floor(event.durationSeconds / 60)} minutes • {event.locationType}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <ChevronRight color="grey" />
                                        </Stack>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                )

            case 2: // Slot Selection
                if (loadingSlots) return <PageSpinner />
                if (slots.length === 0) return <Typography align="center" sx={{ py: 4 }}>No available slots for the next 7 days.</Typography>

                // Group slots by day
                const groupedSlots: Record<string, string[]> = {}
                slots.forEach(s => {
                    const d = new Date(s).toISOString().split('T')[0]
                    if (!groupedSlots[d]) groupedSlots[d] = []
                    groupedSlots[d].push(s)
                })

                return (
                    <Box>
                        {Object.entries(groupedSlots).map(([day, daySlots]) => (
                            <Box key={day} sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(day + 'T00:00:00'))}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' },
                                        gap: 1
                                    }}
                                >
                                    {daySlots.map(s => (
                                        <Button
                                            key={s}
                                            variant={selectedSlot === s ? 'contained' : 'outlined'}
                                            fullWidth
                                            size="small"
                                            onClick={() => setSelectedSlot(s)}
                                            sx={{ borderRadius: 1 }}
                                        >
                                            {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(s))}
                                        </Button>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" disabled={!selectedSlot} onClick={handleNext}>
                                Next
                            </Button>
                        </Box>
                    </Box>
                )

            case 3: // Confirmation
                return (
                    <Box component={Paper} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Enter Your Details</Typography>
                        <Stack spacing={3}>
                            <TextField
                                label="Full Name"
                                fullWidth
                                required
                                value={studentInfo.name}
                                onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                            />
                            <TextField
                                label="Email Address"
                                fullWidth
                                required
                                type="email"
                                value={studentInfo.email}
                                onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
                            />
                            <TextField
                                label="What is your specific question or problem?"
                                fullWidth
                                multiline
                                rows={2}
                                value={studentInfo.specificQuestion}
                                onChange={(e) => setStudentInfo({ ...studentInfo, specificQuestion: e.target.value })}
                                placeholder="e.g., I'm having trouble with the calculus chain rule..."
                            />
                            <TextField
                                label="What have you already tried?"
                                fullWidth
                                multiline
                                rows={2}
                                value={studentInfo.triedSolutions}
                                onChange={(e) => setStudentInfo({ ...studentInfo, triedSolutions: e.target.value })}
                                placeholder="e.g., I tried these three practice problems but got stuck on step 2..."
                            />
                            <TextField
                                label="What resources have you used so far?"
                                fullWidth
                                multiline
                                rows={2}
                                value={studentInfo.usedResources}
                                onChange={(e) => setStudentInfo({ ...studentInfo, usedResources: e.target.value })}
                                placeholder="e.g., Textbook chapter 4, Khan Academy video on..."
                            />
                            <TextField
                                label="What would you like to achieve in this session?"
                                fullWidth
                                multiline
                                rows={2}
                                value={studentInfo.sessionObjectives}
                                onChange={(e) => setStudentInfo({ ...studentInfo, sessionObjectives: e.target.value })}
                                placeholder="e.g., I want to be able to solve these types of problems independently..."
                            />
                            <TextField
                                label="Additional Notes (Optional)"
                                fullWidth
                                multiline
                                rows={2}
                                value={studentInfo.notes}
                                onChange={(e) => setStudentInfo({ ...studentInfo, notes: e.target.value })}
                            />
                            <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <Button onClick={handleBack}>Back</Button>
                                <Button
                                    variant="contained"
                                    size="large"
                                    disabled={!studentInfo.name || !studentInfo.email}
                                    onClick={handleBook}
                                >
                                    Confirm Booking
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                )

            case 4: // Success
                return (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <CheckCircle2 size={64} color="green" style={{ marginBottom: 16 }} />
                        <Typography variant="h4" fontWeight={700} gutterBottom>Booking Confirmed!</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            We've sent a confirmation email to {studentInfo.email}.
                        </Typography>
                        <Button variant="outlined" onClick={() => window.location.reload()}>
                            Book Another Session
                        </Button>
                    </Box>
                )

            default:
                return null
        }
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Book a Session</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Find the perfect time to connect with our experts.
            </Typography>

            {activeStep < 4 && (
                <Stepper activeStep={activeStep} sx={{ mb: 6 }} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            )}

            {renderStepContent(activeStep)}

            {activeStep > 0 && activeStep < 3 && (
                <Box sx={{ mt: 4 }}>
                    <Button onClick={handleBack} startIcon={<Calendar size={18} />}>
                        Back to previous step
                    </Button>
                </Box>
            )}
        </Box>
    )
}
