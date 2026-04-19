import { useFormContext, Controller } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import type { EventFormValues } from './eventFormSchema'
import {
  getAllowedAssignmentStrategies,
  getDefaultEventAssignmentStrategy,
} from './eventCapabilityRules'
import type { Event, InteractionTypeCaps, TeamMember } from '@/types'

interface EventScheduleFieldsProps {
  caps?: InteractionTypeCaps | null
  event?: Event
  teamMembers?: TeamMember[]
}

/**
 * Handles duration and event-level assignment behavior.
 * Consumes the EventForm context for core form state.
 */
export function EventScheduleFields({ caps, event, teamMembers }: EventScheduleFieldsProps) {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  const assignmentOptions = getAllowedAssignmentStrategies(caps)
  const selectedStrategy =
    watch('assignmentStrategy') ?? getDefaultEventAssignmentStrategy(caps)
  const canChooseStrategy = assignmentOptions.length > 1
  const isRoundRobin = selectedStrategy === 'ROUND_ROBIN'

  const leadershipStrategy = watch('sessionLeadershipStrategy')
  const minCoachCount = watch('minCoachCount')
  const eventCoaches = event?.coaches ?? []
  const leadSelectionOptions =
    eventCoaches.length > 0
      ? eventCoaches.map((coach) => ({
        value: coach.coachUserId,
        label: `${coach.coachUser.firstName} ${coach.coachUser.lastName}`,
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
            <MenuItem value="DIRECT">
              Direct — pick from this event&apos;s assigned coaches
            </MenuItem>
            <MenuItem value="ROUND_ROBIN">Round Robin — rotate across the coach pool</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Round-robin events need at least two coaches assigned and Min Coaches set to ≥ 2.
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
            value={caps ? 'Direct' : 'Select an interaction type first'}
            disabled
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {caps
              ? 'Switch to a multi-coach interaction type if this event should rotate between coaches.'
              : 'Choose an interaction type to see the assignment options available for this event.'}
          </Typography>
        </FormField>
      )}

      {/* Coach pool size — shown for all types when round-robin is selected, always for multi-coach */}
      {(isRoundRobin || caps?.multipleCoaches) && (
        <FormField
          label="Coach Pool Size"
          htmlFor="minCoachCount"
          error={errors.minCoachCount?.message || errors.maxCoachCount?.message}
          info="Set the minimum (required) and maximum (optional) number of coaches for this event pool. Round-robin events require Min ≥ 2."
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <Controller
              name="minCoachCount"
              control={control}
              render={({ field }) => (
                <Input
                  id="minCoachCount"
                  type="number"
                  label="Min coaches"
                  min={1}
                  value={field.value ?? 1}
                  hasError={!!errors.minCoachCount}
                  onChange={(e) => {
                    const { value } = e.target
                    field.onChange(value === '' ? 1 : Number(value))
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Controller
              name="maxCoachCount"
              control={control}
              render={({ field }) => (
                <Input
                  id="maxCoachCount"
                  type="number"
                  label="Max coaches"
                  min={minCoachCount ?? 1}
                  placeholder="No cap"
                  value={field.value ?? ''}
                  hasError={!!errors.maxCoachCount}
                  onChange={(e) => {
                    const { value } = e.target
                    field.onChange(value === '' ? null : Number(value))
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Box>
        </FormField>
      )}

      {/* DIRECT strategy: pick the always-assigned coach (stored as fixedLeadCoachId).
          Shown for all interaction types when DIRECT is selected, unless the FIXED_LEAD
          leadership picker already shows it for multi-coach types. */}
      {selectedStrategy === 'DIRECT' &&
        !(caps?.multipleCoaches && leadershipStrategy === 'FIXED_LEAD') && (
          <FormField
            label="Default Event Host"
            htmlFor="fixedLeadCoachId"
            error={errors.fixedLeadCoachId?.message}
            info="This coach will be the default host for all sessions unless overridden per-slot."
            required
          >
            <Select
              id="fixedLeadCoachId"
              value={watch('fixedLeadCoachId') || ''}
              hasError={!!errors.fixedLeadCoachId}
              {...register('fixedLeadCoachId')}
            >
              <MenuItem value="" disabled>
                Select a coach
              </MenuItem>
              {leadSelectionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {leadSelectionOptions.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Add coaches to this event first, or assign a team member here to auto-add them.
              </Typography>
            )}
          </FormField>
        )}

      {/* Multi-coach-specific: leadership strategy + co-host count */}
      {caps?.multipleCoaches && (
        <Stack spacing={2}>
          {!caps?.derivesLeadershipFromAssignment && (
            <FormField
              label="Leadership strategy"
              htmlFor="sessionLeadershipStrategy"
              error={errors.sessionLeadershipStrategy?.message}
              info="Define how the 'Lead' coach is chosen for each session. Co-coaches will also be added to the session."
            >
              <Select
                id="sessionLeadershipStrategy"
                value={leadershipStrategy ?? 'SINGLE_COACH'}
                hasError={!!errors.sessionLeadershipStrategy}
                {...register('sessionLeadershipStrategy')}
              >
                {!caps?.multipleCoaches && (
                  <MenuItem value="SINGLE_COACH">
                    Single coach — only one coach joins (traditional)
                  </MenuItem>
                )}
                <MenuItem value="ROTATING_LEAD">
                  Rotating lead — round-robin lead, others as co-coaches
                </MenuItem>
                <MenuItem value="FIXED_LEAD">Fixed lead — one specific coach always leads</MenuItem>
              </Select>
            </FormField>
          )}

          {leadershipStrategy === 'FIXED_LEAD' && (
            <FormField
              label="Fixed lead coach"
              htmlFor="fixedLeadCoachId"
              error={errors.fixedLeadCoachId?.message}
              info="Select the coach who will always lead sessions for this event."
              required
            >
              <Select
                id="fixedLeadCoachId"
                value={watch('fixedLeadCoachId') || ''}
                hasError={!!errors.fixedLeadCoachId}
                {...register('fixedLeadCoachId')}
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
              {eventCoaches.length === 0 && !event && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Note: The selected coach will be automatically assigned to this event upon
                  creation.
                </Typography>
              )}
            </FormField>
          )}

          {leadershipStrategy !== 'SINGLE_COACH' && (
            <FormField
              label="Co-hosts per session"
              htmlFor="targetCoHostCount"
              error={errors.targetCoHostCount?.message}
              info="Maximum number of co-hosts assigned alongside the lead coach per booking. Leave blank to include all available coaches."
            >
              <Controller
                name="targetCoHostCount"
                control={control}
                render={({ field }) => (
                  <Input
                    id="targetCoHostCount"
                    type="number"
                    min={1}
                    placeholder="All available"
                    value={field.value ?? ''}
                    hasError={!!errors.targetCoHostCount}
                    onChange={(e) => {
                      const { value } = e.target
                      field.onChange(value === '' ? null : Number(value))
                    }}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>
          )}
        </Stack>
      )}
    </Stack>
  )
}
