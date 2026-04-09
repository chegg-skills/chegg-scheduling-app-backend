import { Controller, useFormContext } from 'react-hook-form'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { FormField } from '@/components/shared/FormField'
import type { EventFormValues } from './eventFormSchema'

const WEEKDAYS = [
    { value: 1, label: 'M' },
    { value: 2, label: 'T' },
    { value: 3, label: 'W' },
    { value: 4, label: 'T' },
    { value: 5, label: 'F' },
    { value: 6, label: 'S' },
    { value: 0, label: 'S' },
]

/** 
 * Handles weekday selection for the event.
 * Consumes the EventForm context.
 */
export function WeekdaySelector() {
    const { control, formState: { errors } } = useFormContext<EventFormValues>()

    return (
        <FormField
            label="Allowed Weekdays"
            htmlFor="allowed-weekdays-toggle"
            error={errors.allowedWeekdays?.message}
            info="Limit session bookings to specific days of the week."
            hint="If no days are selected, all days are allowed (subject to host availability)."
        >
            <Controller
                name="allowedWeekdays"
                control={control}
                render={({ field }) => (
                    <ToggleButtonGroup
                        id="allowed-weekdays-toggle"
                        value={field.value}
                        onChange={(_, next) => field.onChange(next)}
                        aria-label="allowed weekdays"
                        sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                        {WEEKDAYS.map((day) => (
                            <ToggleButton
                                key={day.value}
                                value={day.value}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderRadius: '8px !important',
                                    mx: 0.5,
                                    border: '1px solid !important',
                                    borderColor: 'divider !important',
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                {day.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                )}
            />
        </FormField>
    )
}
