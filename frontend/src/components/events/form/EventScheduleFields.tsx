import { useFormContext, Controller } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import { Switch } from '@/components/shared/form/Switch'
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

  const allowStudentCoachChoice = watch('allowStudentCoachChoice')
  const assignmentOptions = getAllowedAssignmentStrategies(caps)
  const selectedStrategy = watch('assignmentStrategy') ?? getDefaultEventAssignmentStrategy(caps)
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

      {/* ONE_TO_ONE only: let students pick their own coach from the pool */}
      {!caps?.multipleParticipants && !caps?.multipleCoaches && (
        <Stack spacing={0.5}>
          <Controller
            name="allowStudentCoachChoice"
            control={control}
            render={({ field }) => (
              <Switch
                label="Let students choose their coach"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
            Students see the coach pool and pick who they want to book with before seeing available
            slots.
          </Typography>
        </Stack>
      )}

      {!allowStudentCoachChoice &&
        (canChooseStrategy ? (
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
            {isRoundRobin && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Round-robin rotates across all coaches in the pool. At least 2 coaches must be in
                the pool — a single coach has nothing to rotate to.
              </Typography>
            )}
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
              {!caps
                ? 'Choose an interaction type to see the assignment options available for this event.'
                : !caps.multipleCoaches && caps.multipleParticipants
                  ? 'Group sessions always use Direct assignment — all students in the same slot share the same coach.'
                  : 'Switch to a multi-coach interaction type if this event should rotate between coaches.'}
            </Typography>
          </FormField>
        ))}

      {/* Coach pool size — shown for all types when round-robin is selected, always for multi-coach.
          Hidden when allowStudentCoachChoice is ON — students pick at booking time. */}
      {!allowStudentCoachChoice && (isRoundRobin || caps?.multipleCoaches) && (
        <FormField
          label="Coach Pool Size"
          htmlFor="minCoachCount"
          error={errors.minCoachCount?.message || errors.maxCoachCount?.message}
          info="Controls how many coaches can be in this event's rotation pool — not how many join each session. ONE_TO_ONE sessions always have exactly one coach per booking regardless of pool size. Round-robin requires Min ≥ 2 so there is always someone to rotate to."
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
          leadership picker already shows it for multi-coach types.
          Hidden when allowStudentCoachChoice is ON — students pick at booking time. */}
      {!allowStudentCoachChoice &&
        selectedStrategy === 'DIRECT' &&
        !(caps?.multipleCoaches && leadershipStrategy === 'FIXED_LEAD') && (
          <FormField
            label="Default Event Host"
            htmlFor="fixedLeadCoachId"
            error={errors.fixedLeadCoachId?.message}
            info="This coach will be the default host for all sessions unless overridden per-slot."
          >
            <Select
              id="fixedLeadCoachId"
              value={watch('fixedLeadCoachId') || ''}
              hasError={!!errors.fixedLeadCoachId}
              inputProps={{ 'aria-label': 'Default Event Host' }}
              {...register('fixedLeadCoachId')}
            >
              <MenuItem value="">
                <em>No default host</em>
              </MenuItem>
              {leadSelectionOptions.map((option, index) => (
                <MenuItem key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {leadSelectionOptions.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Add coaches to this event first, or assign a team member here to auto-add them.
              </Typography>
            )}
            {!watch('fixedLeadCoachId') && eventCoaches.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                No default host selected and no coaches are assigned yet. Students will not be able
                to book sessions until at least one coach is added to this event.
              </Alert>
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
                <MenuItem value="">
                  <em>Select a lead coach</em>
                </MenuItem>
                {leadSelectionOptions.map((option, index) => (
                  <MenuItem key={`${option.value}-${index}`} value={option.value}>
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
