import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import type { UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/shared/Button'
import type { EventFormValues } from './eventFormSchema'

interface EventFormSubmitActionsProps {
    register: UseFormRegister<EventFormValues>
    isPending: boolean
    isEdit: boolean
    onCancel?: () => void
    defaultActive?: boolean
}

export function EventFormSubmitActions({
    register,
    isPending,
    isEdit,
    onCancel,
    defaultActive = true,
}: EventFormSubmitActionsProps) {
    return (
        <Stack spacing={4}>
            <Box sx={{ py: 1 }}>
                <FormControlLabel
                    label="Event is Active"
                    control={
                        <Switch
                            defaultChecked={defaultActive}
                            {...register('isActive')}
                        />
                    }
                />
            </Box>

            <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                <Button variant="secondary" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
                    {isEdit ? 'Save changes' : 'Create event'}
                </Button>
            </Stack>
        </Stack>
    )
}
