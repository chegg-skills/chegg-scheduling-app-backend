import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { EventFormValues } from './eventFormSchema'
import { getAllowedAssignmentStrategies, getDefaultEventAssignmentStrategy } from './eventCapabilityRules'
import type { Event, EventInteractionType, TeamMember } from '@/types'

interface EventScheduleFieldsProps {
  selectedInteractionType?: EventInteractionType | null
  event?: Event
  teamMembers?: TeamMember[]
}

/** 
 * Handles duration and event-level assignment behavior.
 * Consumes the EventForm context for core form state.
 */
export function EventScheduleFields({
  selectedInteractionType,
  event,
  teamMembers,
}: EventScheduleFieldsProps) {
  const { register, watch, formState: { errors } } = useFormContext<EventFormValues>()

  const assignmentOptions = getAllowedAssignmentStrategies(selectedInteractionType)
  const selectedStrategy = watch('assignmentStrategy') ?? getDefaultEventAssignmentStrategy(selectedInteractionType)
  const canChooseStrategy = assignmentOptions.length > 1

  const leadershipStrategy = watch('sessionLeadershipStrategy')
  const eventHosts = event?.hosts ?? []
  const leadSelectionOptions = eventHosts.length > 0
    ? eventHosts.map((host) => ({
      value: host.hostUserId,
      label: `${host.hostUser.firstName} ${host.hostUser.lastName}`,
    }))
    : (teamMembers ?? []).map((member) => ({
      value: member.userId,
      label: `${member.user.firstName} ${member.user.lastName}`,
    }))

  return (
    <Stack spacing={2}>
      <FormField
        label="Duration (minutes)"
        htmlFor="durationMinutes"
        error={errors.durationMinutes?.message}
        info="How long the event will last (e.g., 60 for one hour)."
        required
      >
        <Input
          id="durationMinutes"
          type="number"
          min="1"
          hasError={!!errors.durationMinutes}
          {...register('durationMinutes', { valueAsNumber: true })}
        />
      </FormField>

      {canChooseStrategy ? (
        <FormField
          label="Assignment Strategy"
          htmlFor="assignmentStrategy"
          error={errors.assignmentStrategy?.message}
          info="The selected interaction type supports both direct and round-robin assignment, so choose the behavior for this event."
        >
          <Select
            id="assignmentStrategy"
            value={selectedStrategy}
            hasError={!!errors.assignmentStrategy}
            {...register('assignmentStrategy')}
          >
            <MenuItem value="DIRECT">Direct — pick from this event&apos;s assigned coaches</MenuItem>
            <MenuItem value="ROUND_ROBIN">Round Robin — rotate across the coach pool</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Round-robin events still need at least two coaches to be assigned later.
          </Typography>
        </FormField>
      ) : (
        <FormField
          label="Assignment Strategy"
          htmlFor="assignmentStrategyLocked"
          info="This interaction type only supports direct assignment for events."
        >
          <Input
            id="assignmentStrategyLocked"
            value={selectedInteractionType ? 'Direct' : 'Select an interaction type first'}
            disabled
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {selectedInteractionType
              ? 'Switch to an interaction type with round-robin capability if this event should rotate between hosts.'
              : 'Choose an interaction type to see the assignment options available for this event.'}
          </Typography>
        </FormField>
      )}

      {selectedInteractionType?.supportsSimultaneousCoaches && (
        <Stack spacing={2}>
          <FormField
            label="Leadership strategy"
            htmlFor="sessionLeadershipStrategy"
            error={errors.sessionLeadershipStrategy?.message}
            info="Define how the 'Lead' coach is chosen for each session. Co-hosts will also be added to the session."
          >
            <Select
              id="sessionLeadershipStrategy"
              value={leadershipStrategy ?? 'SINGLE_HOST'}
              hasError={!!errors.sessionLeadershipStrategy}
              {...register('sessionLeadershipStrategy')}
            >
              <MenuItem value="SINGLE_HOST">Single host — only one coach joins (traditional)</MenuItem>
              <MenuItem value="ROTATING_LEAD">Rotating lead — round-robin lead, others as co-hosts</MenuItem>
              <MenuItem value="FIXED_LEAD">Fixed lead — one specific coach always leads</MenuItem>
            </Select>
          </FormField>

          {leadershipStrategy === 'FIXED_LEAD' && (
            <FormField
              label="Fixed lead coach"
              htmlFor="fixedLeadHostId"
              error={errors.fixedLeadHostId?.message}
              info="Select the coach who will always lead sessions for this event."
              required
            >
              <Select
                id="fixedLeadHostId"
                value={watch('fixedLeadHostId') || ''}
                hasError={!!errors.fixedLeadHostId}
                {...register('fixedLeadHostId')}
              >
                <MenuItem value="" disabled>
                  Select a lead coach
                </MenuItem>
                {leadSelectionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {eventHosts.length === 0 && !event && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Note: The selected coach will be automatically assigned to this event upon creation.
                </Typography>
              )}
            </FormField>
          )}
        </Stack>
      )}
    </Stack>
  )
}
