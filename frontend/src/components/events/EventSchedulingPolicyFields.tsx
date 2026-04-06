import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { UseFormRegister, FieldErrors, UseFormWatch, Control } from 'react-hook-form'
import type { EventFormValues } from './eventFormSchema'
import type { EventInteractionType } from '@/types'
import { WeekdaySelector } from './WeekdaySelector'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'

interface Props {
    register: UseFormRegister<EventFormValues>
    errors: FieldErrors<EventFormValues>
    watch: UseFormWatch<EventFormValues>
    control: Control<EventFormValues>
    selectedInteractionType?: EventInteractionType | null
}

export function EventSchedulingPolicyFields({
    register,
    errors,
    watch,
    control,
    selectedInteractionType,
}: Props) {
    const bookingMode = watch('bookingMode')

    return (
        <Stack spacing={3}>
            <FormField
                label="Booking Mode"
                htmlFor="bookingMode"
                error={errors.bookingMode?.message}
                info="Flexible: users can book any time based on host availability. Fixed Slots: users can only book predefined sessions."
            >
                <Select id="bookingMode" value={bookingMode || 'HOST_AVAILABILITY'} {...register('bookingMode')}>
                    <MenuItem value="HOST_AVAILABILITY">Flexible — Based on Host Availability</MenuItem>
                    <MenuItem value="FIXED_SLOTS">Fixed — Predefined session slots only</MenuItem>
                </Select>
            </FormField>

            <WeekdaySelector control={control} errors={errors} />

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
                control={control}
                errors={errors}
                watch={watch}
                selectedInteractionType={selectedInteractionType}
            />
        </Stack>
    )
}
