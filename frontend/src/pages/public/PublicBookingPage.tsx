import { useState } from 'react'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Calendar } from 'lucide-react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { usePublicTeams, usePublicTeamEvents, usePublicSlots } from '@/hooks/usePublicBooking'
import { bookingsApi } from '@/api/bookings'

import { TeamStep } from '@/components/public/booking/TeamStep'
import { EventStep } from '@/components/public/booking/EventStep'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { ConfirmationForm } from '@/components/public/booking/ConfirmationForm'
import { SuccessStep } from '@/components/public/booking/SuccessStep'

const STEPS = ['Category', 'Session', 'Schedule', 'Confirm']

export function PublicBookingPage() {
    const [activeStep, setActiveStep] = useState(0)
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
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

    // Fetch slots for the selected date (full day range)
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).toISOString()
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).toISOString()

    const { data: slots = [], isLoading: loadingSlots } = usePublicSlots(selectedEvent || '', startDate, endDate)

    const handleNext = () => setActiveStep((prev) => prev + 1)
    const handleBack = () => setActiveStep((prev) => prev - 1)

    const handleBook = async () => {
        if (!selectedTeam || !selectedEvent || !selectedSlot) return;

        setIsSubmitting(true)
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
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <TeamStep
                        teams={teams}
                        loading={loadingTeams}
                        error={teamsError}
                        selectedTeamId={selectedTeam}
                        onSelect={(id) => { setSelectedTeam(id); handleNext(); }}
                    />
                )
            case 1:
                return (
                    <EventStep
                        events={events}
                        loading={loadingEvents}
                        selectedEventId={selectedEvent}
                        onSelect={(id) => { setSelectedEvent(id); handleNext(); }}
                    />
                )
            case 2:
                return (
                    <SlotStep
                        slots={slots}
                        loading={loadingSlots}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        selectedSlot={selectedSlot}
                        onSelect={setSelectedSlot}
                        onNext={handleNext}
                    />
                )
            case 3:
                return (
                    <ConfirmationForm
                        studentInfo={studentInfo}
                        isSubmitting={isSubmitting}
                        onUpdate={setStudentInfo}
                        onBack={handleBack}
                        onConfirm={handleBook}
                    />
                )
            case 4:
                return (
                    <SuccessStep
                        email={studentInfo.email}
                        onReset={() => window.location.reload()}
                    />
                )
            default:
                return null
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
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
        </LocalizationProvider>
    )
}
