import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { EventFormValues } from './eventFormSchema'
import type { EventInteractionType } from '@/types'
import { WeekdaySelector } from './WeekdaySelector'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'

interface EventSchedulingPolicyFieldsProps {
    selectedInteractionType?: EventInteractionType | null
}

/** 
 * Handles booking mode, weekdays, notice, and capacity fields.
 * Consumes the EventForm context.
 */
export function EventSchedulingPolicyFields({
    selectedInteractionType,
}: EventSchedulingPolicyFieldsProps) {
    const { register, watch, formState: { errors } } = useFormContext<EventFormValues>()
    const bookingMode = watch('bookingMode')

    return (
        <Stack spacing={3}>
            <FormField
                label="Booking Mode"
                htmlFor="bookingMode"
                error={errors.bookingMode?.message}
                info="Flexible: users can book any time based on coach availability. Fixed Slots: users can only book predefined sessions."
            >
                <Select id="bookingMode" value={bookingMode || 'HOST_AVAILABILITY'} {...register('bookingMode')}>
                    <MenuItem value="HOST_AVAILABILITY">Flexible — Based on Coach Availability</MenuItem>
                    <MenuItem value="FIXED_SLOTS">Fixed — Predefined session slots only</MenuItem>
                </Select>
            </FormField>

            <WeekdaySelector />

            <FormField
                label="Minimum Notice (minutes)"
                htmlFor="minimumNoticeMinutes"
                error={errors.minimumNoticeMinutes?.message}
                info="How much time in advance must a booking be made? (e.g., 180 for 3 hours)."
            >
                <Input
                    id="minimumNoticeMinutes"
                    type="number"
                    min="0"
                    {...register('minimumNoticeMinutes', { valueAsNumber: true })}
                />
            </FormField>

            <ParticipantCapacityFields
                selectedInteractionType={selectedInteractionType}
            />
        </Stack>
    )
}
