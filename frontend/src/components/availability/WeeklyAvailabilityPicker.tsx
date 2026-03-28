import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { Button } from '@/components/shared/Button'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import { Plus, Trash2, Copy } from 'lucide-react'
import type { SetWeeklyAvailabilityDto } from '@/types'

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
]

interface TimeSlot {
    startTime: string
    endTime: string
}

interface DayAvailability {
    enabled: boolean
    slots: TimeSlot[]
}

interface WeeklyAvailabilityPickerProps {
    value: SetWeeklyAvailabilityDto
    onChange: (value: SetWeeklyAvailabilityDto) => void
    disabled?: boolean
}

export function WeeklyAvailabilityPicker({
    value,
    onChange,
    disabled
}: WeeklyAvailabilityPickerProps) {
    const [days, setDays] = useState<DayAvailability[]>(
        Array.from({ length: 7 }, (_, i) => {
            const daySlots = value.filter((s) => s.dayOfWeek === i)
            return {
                enabled: daySlots.length > 0,
                slots: daySlots.length > 0 ? daySlots.map(({ startTime, endTime }) => ({ startTime, endTime })) : [{ startTime: '09:00', endTime: '17:00' }]
            }
        })
    )

    useEffect(() => {
        const newValue: SetWeeklyAvailabilityDto = []
        days.forEach((day, i) => {
            if (day.enabled) {
                day.slots.forEach((slot) => {
                    newValue.push({
                        dayOfWeek: i,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    })
                })
            }
        })
        // Only call onChange if the value actually changed to avoid loops
        if (JSON.stringify(newValue.sort((a, b) => a.dayOfWeek - b.dayOfWeek)) !== JSON.stringify(value.sort((a, b) => a.dayOfWeek - b.dayOfWeek))) {
            // onChange(newValue) // We might want to save on button click instead of every change
        }
    }, [days])

    const handleToggleDay = (index: number) => {
        setDays((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], enabled: !next[index].enabled }
            return next
        })
    }

    const handleAddSlot = (dayIndex: number) => {
        setDays((prev) => {
            const next = [...prev]
            const lastSlot = next[dayIndex].slots[next[dayIndex].slots.length - 1]
            // Default to an hour after the last slot if possible, or just 1 hour duration
            const nextStart = lastSlot ? lastSlot.endTime : '09:00'
            const [h, m] = nextStart.split(':').map(Number)
            const nextEnd = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`

            next[dayIndex] = {
                ...next[dayIndex],
                slots: [...next[dayIndex].slots, { startTime: nextStart, endTime: nextEnd }]
            }
            return next
        })
    }

    const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
        setDays((prev) => {
            const next = [...prev]
            const newSlots = next[dayIndex].slots.filter((_, i) => i !== slotIndex)
            if (newSlots.length === 0) {
                next[dayIndex] = { ...next[dayIndex], enabled: false, slots: [{ startTime: '09:00', endTime: '17:00' }] }
            } else {
                next[dayIndex] = { ...next[dayIndex], slots: newSlots }
            }
            return next
        })
    }

    const handleTimeChange = (dayIndex: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
        setDays((prev) => {
            const next = [...prev]
            const newSlots = [...next[dayIndex].slots]
            newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
            next[dayIndex] = { ...next[dayIndex], slots: newSlots }
            return next
        })
    }

    const handleCopyDay = (fromIndex: number) => {
        const slotsToCopy = [...days[fromIndex].slots]
        setDays((prev) => prev.map((day, i) => {
            if (i !== fromIndex && day.enabled) {
                return { ...day, slots: JSON.parse(JSON.stringify(slotsToCopy)) }
            }
            return day
        }))
    }

    const resetDays = () => {
        setDays(
            Array.from({ length: 7 }, (_, i) => {
                const daySlots = value.filter((s) => s.dayOfWeek === i)
                return {
                    enabled: daySlots.length > 0,
                    slots: daySlots.length > 0 ? daySlots.map(({ startTime, endTime }) => ({ startTime, endTime })) : [{ startTime: '09:00', endTime: '17:00' }]
                }
            })
        )
    }

    // Update internal state when external value changes (e.g., after save)
    useEffect(() => {
        resetDays()
    }, [value])

    const onSave = () => {
        const newValue: SetWeeklyAvailabilityDto = []
        days.forEach((day, i) => {
            if (day.enabled) {
                day.slots.forEach((slot) => {
                    newValue.push({
                        dayOfWeek: i,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    })
                })
            }
        })
        onChange(newValue)
    }

    return (
        <Box>
            <Stack spacing={2} divider={<Divider />}>
                {days.map((day, i) => (
                    <Stack
                        key={DAYS[i]}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                        sx={{ py: 1 }}
                    >
                        <Box sx={{ width: 120, display: 'flex', alignItems: 'center' }}>
                            <Switch
                                checked={day.enabled}
                                onChange={() => handleToggleDay(i)}
                                disabled={disabled}
                                size="small"
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, ml: 1, minWidth: 80 }}>
                                {DAYS[i]}
                            </Typography>
                        </Box>

                        <Box sx={{ flexGrow: 1 }}>
                            {!day.enabled ? (
                                <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
                                    Unavailable
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {day.slots.map((slot, slotIdx) => (
                                        <Stack key={slotIdx} direction="row" spacing={1} alignItems="center">
                                            <input
                                                type="time"
                                                value={slot.startTime}
                                                onChange={(e) => handleTimeChange(i, slotIdx, 'startTime', e.target.value)}
                                                disabled={disabled}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc',
                                                    background: 'transparent',
                                                    color: 'inherit',
                                                    fontSize: '0.875rem'
                                                }}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                to
                                            </Typography>
                                            <input
                                                type="time"
                                                value={slot.endTime}
                                                onChange={(e) => handleTimeChange(i, slotIdx, 'endTime', e.target.value)}
                                                disabled={disabled}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc',
                                                    background: 'transparent',
                                                    color: 'inherit',
                                                    fontSize: '0.875rem'
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveSlot(i, slotIdx)}
                                                disabled={disabled}
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Box>

                        {day.enabled && (
                            <Stack direction="row" spacing={1}>
                                <Tooltip title="Add slot">
                                    <IconButton size="small" color="primary" onClick={() => handleAddSlot(i)} disabled={disabled}>
                                        <Plus size={16} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Apply to other days">
                                    <IconButton size="small" onClick={() => handleCopyDay(i)} disabled={disabled}>
                                        <Copy size={16} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        )}
                    </Stack>
                ))}
            </Stack>

            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                    variant="secondary"
                    onClick={resetDays}
                    disabled={disabled}
                >
                    Cancel
                </Button>
                <Button variant="primary" onClick={onSave} disabled={disabled} sx={{ minWidth: 160 }}>
                    Save changes
                </Button>
            </Box>
        </Box>
    )
}
