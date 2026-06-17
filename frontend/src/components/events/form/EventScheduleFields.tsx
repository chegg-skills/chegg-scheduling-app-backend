import { useFormContext, Controller } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import { Switch } from '@/components/shared/form/Switch'
import { Autocomplete } from '@/components/shared/form/Autocomplete'
import type { EventFormValues } from './eventFormSchema'
import {
  getAllowedAssignmentStrategies,
  getDefaultEventAssignmentStrategy,
} from './eventCapabilityRules'
import type { Event, InteractionTypeCaps, SafeUser, TeamMember } from '@/types'

interface EventScheduleFieldsProps {
  caps?: InteractionTypeCaps | null
  event?: Event
  teamMembers?: TeamMember[]
}

function HostOptionLabel({ user, isCompact = false }: { user: SafeUser; isCompact?: boolean }) {
  return (
    <Stack direction="row" spacing={isCompact ? 1 : 1.5} alignItems="center">
      <Avatar
        src={user.avatarUrl ?? undefined}
        sx={{
          width: isCompact ? 24 : 28,
          height: isCompact ? 24 : 28,
          fontSize: isCompact ? '0.7rem' : '0.8rem',
          bgcolor: 'primary.light',
          color: 'primary.dark',
        }}
      >
        {user.firstName?.[0] ?? '?'}
        {user.lastName?.[0] ?? ''}
      </Avatar>

      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isCompact ? 500 : 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.firstName} {user.lastName}
        </Typography>
        {!isCompact && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.email}
          </Typography>
        )}
      </Box>
    </Stack>
  )
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
  const eventCoaches = event?.coaches ?? []
  const leadSelectionOptions: SafeUser[] =
    eventCoaches.length > 0
      ? eventCoaches.map((coach) => coach.coachUser)
      : (teamMembers ?? []).map((member) => member.user)

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

      {!allowStudentCoachChoice && canChooseStrategy && (
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
            required
            error={errors.fixedLeadCoachId?.message}
            info="This coach will be the default host for all sessions unless overridden per-slot."
          >
            <Controller
              name="fixedLeadCoachId"
              control={control}
              render={({ field }) => {
                const selectedCoach = leadSelectionOptions.find((c) => c.id === field.value)

                return (
                  <Autocomplete<SafeUser, false, false, false>
                    id="fixedLeadCoachId"
                    options={leadSelectionOptions}
                    value={selectedCoach ?? null}
                    onChange={(_event, newValue) => {
                      field.onChange(newValue ? newValue.id : null)
                    }}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                    isOptionEqualToValue={(option, val) => option.id === val.id}
                    placeholder="Search and select default host…"
                    error={!!errors.fixedLeadCoachId}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props as any
                      return (
                        <Box component="li" key={key} {...otherProps} sx={{ py: 0.75, px: 1.5 }}>
                          <HostOptionLabel user={option} />
                        </Box>
                      )
                    }}
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, 6],
                            },
                          },
                        ],
                      },
                    }}
                  />
                )
              }}
            />
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
              <Controller
                name="fixedLeadCoachId"
                control={control}
                render={({ field }) => {
                  const selectedCoach = leadSelectionOptions.find((c) => c.id === field.value)

                  return (
                    <Autocomplete<SafeUser, false, false, false>
                      id="fixedLeadCoachId"
                      options={leadSelectionOptions}
                      value={selectedCoach ?? null}
                      onChange={(_event, newValue) => {
                        field.onChange(newValue ? newValue.id : null)
                      }}
                      getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                      isOptionEqualToValue={(option, val) => option.id === val.id}
                      placeholder="Search and select lead coach…"
                      error={!!errors.fixedLeadCoachId}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props as any
                        return (
                          <Box component="li" key={key} {...otherProps} sx={{ py: 0.75, px: 1.5 }}>
                            <HostOptionLabel user={option} />
                          </Box>
                        )
                      }}
                      slotProps={{
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: {
                                offset: [0, 6],
                              },
                            },
                          ],
                        },
                      }}
                    />
                  )
                }}
              />
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
