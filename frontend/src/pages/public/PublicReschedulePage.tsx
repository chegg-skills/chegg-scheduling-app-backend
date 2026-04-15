import * as React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { startOfDay, endOfDay } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { publicApi } from '@/api/public';
import { bookingsApi } from '@/api/bookings';
import { PageSpinner } from '@/components/shared/Spinner';
import { SuccessStep } from '@/components/public/booking/SuccessStep';
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader';
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary';
import { SlotStep } from '@/components/public/booking/SlotStep';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout';
import { PublicSidePanel } from '@/components/public/layout/PublicSidePanel';
import { PublicMainContent } from '@/components/public/layout/PublicMainContent';
import { PublicNavigationFooter } from '@/components/public/layout/PublicNavigationFooter';
import { PublicMobileHeader } from '@/components/public/layout/PublicMobileHeader';
import { PublicStepHeader } from '@/components/public/layout/PublicStepHeader';

export function PublicReschedulePage() {
    const { bookingId = '' } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);

    // 1. Fetch Booking Details
    const { data: bookingData, isLoading: isLoadingBooking, error: bookingError } = useQuery({
        queryKey: ['public', 'booking', bookingId, token],
        queryFn: ({ signal }) => publicApi.getBooking(bookingId, token, signal).then(r => r.data.data?.booking),
        enabled: !!bookingId && !!token,
        retry: false,
    });

    // 2. Fetch Slots for the Event
    const { startDate, endDate } = React.useMemo(() => ({
        startDate: startOfDay(selectedDate).toISOString(),
        endDate: endOfDay(selectedDate).toISOString()
    }), [selectedDate]);

    const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
        queryKey: ['public', 'slots', bookingData?.eventId, startDate, endDate],
        queryFn: ({ signal }) =>
            publicApi.getAvailableSlots(bookingData?.eventId || '', startDate, endDate, undefined, signal)
                .then(r => r.data.data?.slots),
        enabled: !!bookingData?.eventId,
    });

    const slots = slotsData || [];

    const handleReschedule = async () => {
        if (!selectedSlot) return;

        setIsSubmitting(true);
        try {
            await bookingsApi.reschedule(bookingId, {
                startTime: selectedSlot,
                token
            });
            setIsSuccess(true);
        } catch (error: any) {
            console.error('Reschedule failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingBooking) return <PageSpinner />;

    if (bookingError || !bookingData) {
        const errorMessage = (bookingError as any)?.response?.data?.message || (bookingError as Error)?.message || (!token ? "Reschedule token is missing from the link." : "Booking not found or link has expired.");
        return (
            <Box sx={{ p: { xs: 2, sm: 4 } }}>
                <ErrorAlert message={errorMessage} />
                <Button onClick={() => navigate('/')} variant="outlined" sx={{ mt: 2 }}>Back to homepage</Button>
            </Box>
        );
    }

    if (isSuccess) {
        return (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <SuccessStep
                    email={bookingData.studentEmail}
                    mode="reschedule"
                    newDate={selectedDate}
                    newTime={selectedSlot ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(selectedSlot)) : ''}
                    eventName={bookingData.event?.name || ''}
                    onReset={() => window.location.reload()}
                />
            </LocalizationProvider>
        );
    }

    const currentBookingInfo = {
        teamDetails: (bookingData.event as any)?.team,
        eventDetails: bookingData.event as any,
        coachDetails: bookingData.host as any,
        date: new Date(bookingData.startTime),
        slot: bookingData.startTime
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <PublicBaseLayout>
                {/* Column 1: Information & Current Session Details */}
                <PublicSidePanel>
                    <PublicBookingHeader
                        scope="event"
                        customHeading="Reschedule your current session"
                        customSubtitle="Select a new time below to update your booking."
                        eventDetails={bookingData.event as any}
                        coachDetails={bookingData.host as any}
                    />

                    <PublicBookingSummary
                        title="Current Session"
                        variant="current"
                        {...currentBookingInfo}
                        selectedDate={currentBookingInfo.date}
                        selectedSlot={currentBookingInfo.slot}
                    />

                    <PublicBookingSummary
                        title="New Selection"
                        selectedDate={selectedDate}
                        selectedSlot={selectedSlot}
                    />
                </PublicSidePanel>

                {/* Column 2: Content Area */}
                <PublicMainContent>
                    <PublicStepHeader showStepper={false}>
                        {/* Mobile Header */}
                        <PublicMobileHeader
                            scope="event"
                            customHeading="Reschedule your current session"
                            eventDetails={bookingData.event as any}
                            coachDetails={bookingData.host as any}
                            selectedDate={selectedDate}
                            selectedSlot={selectedSlot}
                            currentBookingDetails={currentBookingInfo}
                        />
                    </PublicStepHeader>

                    {/* Main Step Content */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <SlotStep
                            slots={slots}
                            loading={isLoadingSlots}
                            selectedDate={selectedDate}
                            onDateSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                            selectedSlot={selectedSlot}
                            onSelect={setSelectedSlot}
                        />
                    </Box>

                    <PublicNavigationFooter
                        onBack={() => navigate('/')}
                        onNext={handleReschedule}
                        backLabel="Cancel"
                        nextLabel="Confirm Reschedule"
                        submittingLabel="Updating..."
                        nextDisabled={!selectedSlot}
                        isSubmitting={isSubmitting}
                    />
                </PublicMainContent>
            </PublicBaseLayout>
        </LocalizationProvider>
    );
}
