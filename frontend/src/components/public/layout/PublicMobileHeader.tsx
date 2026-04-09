import * as React from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { PublicBookingHeader } from '@/components/public/booking/PublicBookingHeader'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'
import type { BookingScope } from '@/pages/public/hooks/usePublicBookingState'
import type { PublicCoachSummary, PublicEventSummary, PublicTeamSummary } from '@/types'

interface PublicMobileHeaderProps {
    scope: BookingScope
    teamDetails?: PublicTeamSummary | null
    eventDetails?: PublicEventSummary | null
    coachDetails?: PublicCoachSummary | null
    selectedDate: Date | null
    selectedSlot: string | null
    customHeading?: string
    customSubtitle?: string
    // For Reschedule
    currentBookingDetails?: {
        teamDetails?: PublicTeamSummary | null
        eventDetails?: PublicEventSummary | null
        coachDetails?: PublicCoachSummary | null
        date: Date
        slot: string
    }
}

/**
 * PublicMobileHeader encapsulates the responsive brand, summary, and divider
 * shown on smaller screens where the main side panel is hidden.
 */
export function PublicMobileHeader({
    scope,
    teamDetails,
    eventDetails,
    coachDetails,
    selectedDate,
    selectedSlot,
    customHeading,
    customSubtitle,
    currentBookingDetails
}: PublicMobileHeaderProps) {
    return (
        <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 3 }}>
            <PublicBookingHeader
                scope={scope}
                teamDetails={teamDetails}
                eventDetails={eventDetails}
                coachDetails={coachDetails}
                customHeading={customHeading}
                customSubtitle={customSubtitle}
            />

            <Box sx={{ px: { xs: 0, md: 2 }, mt: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 1.5
                    }}
                >
                    {currentBookingDetails && (
                        <Box sx={{ flex: 1 }}>
                            <PublicBookingSummary
                                title="Current Session"
                                variant="current"
                                compact={true}
                                teamDetails={currentBookingDetails.teamDetails}
                                eventDetails={currentBookingDetails.eventDetails}
                                coachDetails={currentBookingDetails.coachDetails}
                                selectedDate={currentBookingDetails.date}
                                selectedSlot={currentBookingDetails.slot}
                            />
                        </Box>
                    )}

                    <Box sx={{ flex: 1 }}>
                        <PublicBookingSummary
                            title={currentBookingDetails ? "New Selection" : "Your Selection"}
                            compact={true}
                            teamDetails={teamDetails}
                            eventDetails={eventDetails}
                            coachDetails={coachDetails}
                            selectedDate={selectedDate}
                            selectedSlot={selectedSlot}
                        />
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
        </Box>
    )
}
