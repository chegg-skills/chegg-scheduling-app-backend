// ─── Enums ────────────────────────────────────────────────────────────────────
// Shared enums are generated from backend/prisma/schema.prisma — see
// `backend/src/scripts/sync-shared-enums.ts`. Do not redefine them here.

import type {
  UserRole,
  AssignmentStrategy,
  EventLocationType,
  EventBookingMode,
  BookingStatus,
  SessionLeadershipStrategy,
  InteractionType,
  MeetingLinkSource,
} from './generated/enums'

export type {
  UserRole,
  AssignmentStrategy,
  EventLocationType,
  EventBookingMode,
  BookingStatus,
  SessionLeadershipStrategy,
  InteractionType,
  MeetingLinkSource,
}
export type StatsTimeframe =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'all'
  | string // to support 'custom:ISO_START:ISO_END' in URL/params

// ─── Core Models ──────────────────────────────────────────────────────────────

/**
 * Public-safe user shape returned by all authenticated API endpoints.
 * The raw `password`, `ssoSub`, and `ssoProvider` fields are stripped
 * server-side by `toSafeUser()` and are never present on this type.
 *
 * `timezone` is an IANA string (e.g. `"Asia/Kolkata"`) used to localise
 * notification emails for coaches and admins.
 *
 * `ssoLinkedAt` is non-null when the account has been linked to an SSO
 * provider (Okta). It is safe to expose — it is just a timestamp.
 */
export interface SafeUser {
  id: string
  publicBookingSlug: string | null
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  country: string | null
  preferredLanguage: string | null
  avatarUrl: string | null
  role: UserRole
  timezone: string
  zoomIsvLink: string | null
  zoomIsvLinkExpiresAt: string | null
  zoomIsvLinkReminderDays: number | null
  isActive: boolean
  failedLoginAttempts?: number
  lockedUntil?: string | null
  lastLoginAt: string | null
  ssoLinkedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InviteValidation {
  valid: boolean
  email?: string
  role?: UserRole
  requiresSso?: boolean
  reason?: 'not_found' | 'already_accepted' | 'expired'
}

export interface UserWithDetails extends SafeUser {
  teamMemberships: Array<{
    id: string
    team: Team
  }>
  coachedEvents: Array<{
    id: string
    event: Event & {
      eventType: EventType
      interactionType: InteractionType
    }
  }>
  weeklyAvailability: UserWeeklyAvailability[]
  availabilityExceptions: UserAvailabilityException[]
}

/**
 * Per-team notification preferences. A team always has exactly one config
 * record (upserted on first save). `reminderOffsets` is an array of minutes
 * before the session start at which reminder emails are queued
 * (e.g. `[1440, 60]` → 24 h and 1 h reminders).
 */
export interface TeamNotificationConfig {
  teamId: string
  reminderOffsets: number[]
  poolReminderOffsets: number[]
  adminNotifyOnBooking: boolean
  adminNotifyOnCancellation: boolean
  adminNotifyOnNoShow: boolean
  coachNotifyOnBooking: boolean
  coachNotifyOnCancellation: boolean
  coachNotifyOnNoShow: boolean
  notifyLeadOnAvailability: boolean
  sendFeedbackLink: boolean
  feedbackFormLink: string | null
  createdAt?: string
  updatedAt?: string
}

export interface SystemSettings {
  feedbackFormLink: string
}

export interface Team {
  id: string
  publicBookingSlug: string | null
  name: string
  description: string | null
  isActive: boolean
  teamLeadId: string
  createdById: string
  createdAt: string
  updatedAt: string
  teamLead?: SafeUser
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: SafeUser
}

export interface UserInvite {
  id: string
  email: string
  role: UserRole
  token?: string // only in non-prod
  expiresAt: string
  createdAt: string
}

export interface EventType {
  id: string
  key: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
}

/**
 * Capability flags for an interaction type. Sourced from the
 * `GET /event-interaction-types` endpoint which returns the hardcoded
 * `INTERACTION_TYPE_CAPS` map from the backend — not stored in the DB.
 * See `backend/src/shared/constants/interactionType.ts` for flag semantics.
 */
export interface InteractionTypeCaps {
  multipleCoaches: boolean
  multipleParticipants: boolean
  derivesLeadershipFromAssignment: boolean
}

export interface InteractionTypeInfo {
  key: InteractionType
  label: string
  caps: InteractionTypeCaps
}

/** Minimal weekly availability window — dayOfWeek + time range, used for both global and event-specific overrides. */
export interface WeeklyAvailabilitySlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface EventCoachWeeklyAvailability extends WeeklyAvailabilitySlot {
  id: string
  eventId: string
  coachUserId: string
  createdAt: string
  updatedAt: string
}

export interface EventCoach {
  id: string
  eventId: string
  coachUserId: string
  coachOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  coachUser: SafeUser & {
    weeklyAvailability?: UserWeeklyAvailability[]
  }
  weeklyAvailabilityOverride?: EventCoachWeeklyAvailability[]
}

/**
 * Availability status for a single coach within an event's pool, returned by
 * `GET /events/:eventId/schedule-slots/:slotId/coach-availability`.
 * Used in `RevealCoachDialog` to show Available / Conflict chips before
 * the admin selects a coach for the deferred reveal.
 */
export interface CoachAvailabilityEntry {
  coachUserId: string
  coachUser: SafeUser
  isAvailable: boolean
  conflicts?: Array<{ eventName?: string; startTime?: string; endTime?: string }>
}

/**
 * A pre-created time slot for `FIXED_SLOTS` events. Multiple students may book
 * into the same slot (up to `maxParticipantCount`), all sharing the same coach.
 *
 * `coachRevealSentAt` is set when the admin triggers a deferred coach reveal
 * (`deferCoachReveal = true` events only). Once set the reveal endpoint returns
 * 409 to prevent double-sends.
 *
 * `recurrenceGroupId` links slots that were created as part of a recurring
 * series, allowing them to be displayed and managed together.
 */
export interface EventScheduleSlot {
  id: string
  eventId: string
  startTime: string
  endTime: string
  capacity: number | null
  isActive: boolean
  isCancelled: boolean
  createdAt: string
  updatedAt: string
  assignedCoachId: string | null
  recurrenceGroupId: string | null
  coachRevealSentAt: string | null
  sessionJoinUrl: string | null
  assignedCoach?: SafeUser | null
  _count?: {
    bookings: number
  }
  sessionLog?: SessionLog | null
  recurrenceGroup?: {
    id: string
    frequency: string
    isContinuous: boolean
    isActive: boolean
  } | null
}

/**
 * Full event record returned by authenticated admin/coach endpoints.
 *
 * Key scheduling fields:
 * - `bookingMode` — `COACH_AVAILABILITY` (students pick any open slot) or
 *   `FIXED_SLOTS` (students book into admin-created slots). Group interaction
 *   types always use `FIXED_SLOTS`.
 * - `deferCoachReveal` — ONE_TO_MANY only. When `true`, confirmation emails
 *   omit the coach name/join URL until the admin sends the reveal.
 *   **Immutable once any booking exists.**
 * - `targetCoHostCount` — max co-hosts per session for multi-coach types
 *   (`null` = all available coaches join as co-hosts).
 * - `maxBookingWindowDays` — prevents bookings further than N days from today
 *   (`null` = no limit). Enforced by both the availability service and the
 *   public booking UI's `SlotStep`.
 * - `showDescription` — when `true`, renders `description` in the
 *   `SessionIntroduction` component on the public booking page.
 */
export interface Event {
  id: string
  publicBookingSlug: string | null
  name: string
  description: string | null
  isActive: boolean
  eventTypeId: string
  interactionType: InteractionType
  assignmentStrategy: AssignmentStrategy
  bookingMode: EventBookingMode
  durationSeconds: number
  locationType: EventLocationType
  locationValue: string
  minimumNoticeMinutes: number
  sessionLeadershipStrategy: SessionLeadershipStrategy
  fixedLeadCoachId: string | null
  targetCoHostCount: number | null
  maxParticipantCount: number | null
  bufferAfterMinutes: number
  showDescription: boolean
  deferCoachReveal: boolean
  allowAnonymousBooking: boolean
  allowStudentCoachChoice: boolean
  meetingLinkSource: MeetingLinkSource
  maxBookingWindowDays: number | null
  recurrenceVisibilityLimit?: number | null
  teamId: string
  groupId: string | null
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  eventType: EventType
  coaches: EventCoach[]
  team?: {
    id: string
    name: string
  }
  group?: {
    id: string
    name: string
    color: string | null
  } | null
  scheduleSlots?: EventScheduleSlot[]
  _count?: {
    bookings: number
    scheduleSlots: number
  }
}

export interface EventGroup {
  id: string
  teamId: string
  name: string
  description: string | null
  color: string | null
  createdById: string
  publicBookingSlug: string
  createdAt: string
  updatedAt: string
  _count?: {
    events: number
  }
}

export interface PublicTeamSummary extends Pick<
  Team,
  'id' | 'name' | 'description' | 'publicBookingSlug'
> { }

export interface PublicGroupSummary extends Pick<
  EventGroup,
  'id' | 'teamId' | 'name' | 'description' | 'color' | 'publicBookingSlug'
> {
  team: PublicTeamSummary
}

export interface PublicHostInfo {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export interface PublicCoachSummary extends PublicHostInfo {
  timezone: string
  publicBookingSlug: string | null
}

export interface PublicEventCoach {
  coachUserId: string
  coachOrder: number
  coachUser: Pick<SafeUser, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>
}

export interface PublicEventSummary extends Pick<
  Event,
  | 'id'
  | 'name'
  | 'description'
  | 'durationSeconds'
  | 'locationType'
  | 'teamId'
  | 'publicBookingSlug'
  | 'interactionType'
  | 'assignmentStrategy'
  | 'showDescription'
  | 'allowStudentCoachChoice'
  | 'bookingMode'
  | 'maxBookingWindowDays'
  | 'recurrenceVisibilityLimit'
> {
  team: PublicTeamSummary
  coaches: PublicEventCoach[]
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: unknown
}

export interface StatsTimeframeInfo {
  key: StatsTimeframe
  label: string
  startDate: string | null
  endDate: string | null
  rangeLabel: string
}

export interface StatsSummary<TMetrics = Record<string, any>> {
  timeframe: StatsTimeframeInfo
  metrics: TMetrics
}

export interface BookingTrend {
  date: string
  count: number
  completed: number
  noShow: number
  cancelled: number
}

export interface BookingTrendsStats {
  trends: BookingTrend[]
}

export interface TeamPerformanceMetric {
  teamId: string
  name: string
  total: number
  completed: number
  cancelled: number
  noShow: number
}

export interface TeamPerformanceStats {
  performance: TeamPerformanceMetric[]
}

export interface PeakActivityMetric {
  hour: number
  count: number
}

export interface PeakActivityStats {
  activity: PeakActivityMetric[]
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface AuthPayload {
  user: SafeUser
  token: string
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string
  password: string
}

export interface BootstrapDto {
  bootstrapSecret: string
  firstName: string
  lastName: string
  email: string
  password: string
  timezone?: string
}

export interface RegisterDto {
  firstName: string
  lastName: string
  email: string
  password: string
  role?: UserRole
  phoneNumber?: string
  country?: string
  preferredLanguage?: string
  avatarUrl?: string
  timezone?: string
}

export interface AcceptInviteDto {
  token: string
  firstName: string
  lastName: string
  password: string
  timezone?: string
}

export interface CreateInviteDto {
  email: string
  role: UserRole
}

export interface UpdateUserDto extends Partial<Omit<RegisterDto, 'role'>> {
  role?: UserRole
  timezone?: string
  zoomIsvLink?: string
  isActive?: boolean
}

export interface CreateTeamDto {
  name: string
  teamLeadId: string
  description?: string
  isActive?: boolean
}

export interface UpdateTeamDto {
  name?: string
  description?: string
  teamLeadId?: string
  isActive?: boolean
}

export interface CreateEventDto {
  name: string
  eventTypeId: string
  interactionType: InteractionType
  locationType: EventLocationType
  locationValue: string
  durationSeconds: number
  assignmentStrategy?: AssignmentStrategy
  bookingMode?: EventBookingMode
  minimumNoticeMinutes?: number
  targetCoHostCount?: number | null
  maxParticipantCount?: number | null
  bufferAfterMinutes?: number
  recurrenceVisibilityLimit?: number | null
  description?: string
  isActive?: boolean
  meetingLinkSource?: MeetingLinkSource
  groupId?: string | null
  deferCoachReveal?: boolean
  allowAnonymousBooking?: boolean
  showDescription?: boolean
  maxBookingWindowDays?: number | null
}

export interface UpdateEventDto extends Partial<CreateEventDto> { }

export interface SetEventCoachesDto {
  coaches: Array<{ userId: string; coachOrder?: number }>
}

export interface CreateEventTypeDto {
  key: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateEventTypeDto extends Partial<CreateEventTypeDto> { }

// Deleted CreateInteractionTypeDto and UpdateInteractionTypeDto manually elsewhere

export interface UserWeeklyAvailability {
  id: string
  userId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface UserAvailabilityException {
  id: string
  userId: string
  date: string
  isUnavailable: boolean
  startTime: string | null
  endTime: string | null
  createdAt: string
  updatedAt: string
}

export type SetWeeklyAvailabilityDto = Array<{
  dayOfWeek: number
  startTime: string
  endTime: string
}>

export interface CreateAvailabilityExceptionDto {
  date: string | Date
  isUnavailable: boolean
  startTime?: string | null
  endTime?: string | null
}

// ─── Session Log Models ───────────────────────────────────────────────────────

export interface SessionAttendance {
  id: string
  sessionLogId: string
  bookingId: string
  attended: boolean
  createdAt: string
  updatedAt: string
  booking?: Booking
}

export interface SessionLog {
  id: string
  scheduleSlotId: string | null
  bookingId: string | null
  loggedByUserId: string
  topicsDiscussed: string | null
  summary: string | null
  coachNotes: string | null
  createdAt: string
  updatedAt: string
  attendance: SessionAttendance[]
  loggedBy?: Pick<SafeUser, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'>
}

export interface UpsertSessionLogDto {
  topicsDiscussed?: string | null
  summary?: string | null
  coachNotes?: string | null
  assignedCoachId?: string
  attendance: Array<{ bookingId: string; attended: boolean }>
}

export interface UpsertBookingSessionLogDto {
  topicsDiscussed?: string | null
  summary?: string | null
  coachNotes?: string | null
  attended?: boolean
}

export interface StudentSessionLogEntry {
  logId: string
  bookingId: string
  sessionDate: string
  eventName: string
  interactionType: string
  coachName: string
  attended: boolean | null
  topicsDiscussed: string | null
  summary: string | null
  coachNotes: string | null
  loggedBy: { id: string; firstName: string; lastName: string } | null
  isGroupSession: boolean
  updatedAt: string
}

// ─── Booking Models ───────────────────────────────────────────────────────────

/**
 * Full booking record returned by authenticated admin/coach endpoints.
 *
 * `timezone` stores the **student's** IANA timezone at booking time (captured
 * from the browser). Notification emails for the student use this value;
 * coach and admin emails use their own `User.timezone` instead.
 *
 * `coCoachUserIds` lists co-hosts assigned to the session in addition to the
 * primary `coachUserId`. For group events, this set is the same across all
 * bookings in the same slot.
 *
 * `rescheduleToken` is a single-use token included in the student's
 * confirmation email link. It is cleared after use or expiry.
 */
export interface Booking {
  id: string
  studentId: string | null
  scheduleSlotId: string | null
  studentName: string
  studentEmail: string
  startTime: string
  endTime: string
  timezone: string
  status: BookingStatus
  notes: string | null
  specificQuestion: string | null
  triedSolutions: string | null
  usedResources: string | null
  sessionObjectives: string | null
  teamId: string
  eventId: string
  coachUserId: string | null
  coCoachUserIds: string[]
  meetingJoinUrl: string | null
  rescheduleToken: string | null
  cancellationReason?: string | null
  createdAt: string
  updatedAt: string
  team?: Pick<Team, 'id' | 'name' | 'publicBookingSlug' | 'description' | 'isActive'>
  event?: Event
  coach?: SafeUser
  scheduleSlot?: EventScheduleSlot
  sessionLog?: SessionLog | null
}

/**
 * Booking shape returned by public-facing endpoints (cancel / reschedule pages).
 * `event` and `coach` carry only the public-safe subset of fields — no internal
 * IDs or admin-only data. Used by `PublicReschedulePage` and the cancellation flow.
 */
export interface PublicBooking extends Omit<Booking, 'event' | 'coach'> {
  event?: PublicEventSummary | null
  coach?: PublicCoachSummary | null
}

export interface CreateBookingDto {
  studentName: string
  studentEmail: string
  teamId: string
  eventId: string
  startTime: string
  timezone?: string
  notes?: string
  specificQuestion?: string
  triedSolutions?: string
  usedResources?: string
  sessionObjectives?: string
  preferredCoachId?: string
}

export interface ListBookingsFilters {
  teamId?: string
  eventId?: string
  coachUserId?: string
  status?: BookingStatus
  search?: string
  startDate?: string | Date
  endDate?: string | Date
  page?: number
  limit?: number
}

export interface UpdateBookingStatusDto {
  status: BookingStatus
  cancellationReason?: string
}
// ─── Student Models ───────────────────────────────────────────────────────────
export interface Student {
  id: string
  fullName: string
  email: string
  firstBookedAt: string | null
  lastBookedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StudentSummary extends Student {
  bookingCount: number
  latestBooking: {
    id: string
    startTime: string
    endTime: string
    status: BookingStatus
    team: { id: string; name: string }
    event: { id: string; name: string; publicBookingSlug: string }
    coach: {
      id: string
      firstName: string
      lastName: string
      email: string
      avatarUrl: string | null
    }
  } | null
}

// ─── Booking Directory Models ──────────────────────────────────────────────────

export interface BookingDirectoryTeamEntry {
  id: string
  sectionId: string
  teamId: string
  sortOrder: number
  createdAt: string
  team: {
    id: string
    name: string
    description: string | null
    publicBookingSlug: string | null
    isActive: boolean
  }
}

export interface BookingDirectorySection {
  id: string
  bookingDirectoryId: string
  eventTypeId: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  eventType: EventType
  teams: BookingDirectoryTeamEntry[]
}

export interface BookingDirectory {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  sections: BookingDirectorySection[]
}

export interface CreateBookingDirectoryDto {
  slug: string
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateBookingDirectoryDto extends Partial<CreateBookingDirectoryDto> { }

export interface AddBookingDirectorySectionDto {
  eventTypeId: string
  sortOrder?: number
}

export interface AddBookingDirectoryTeamDto {
  teamId: string
  sortOrder?: number
}

// ─── Public Booking Directory Types ──────────────────────────────────────────────

export interface PublicBookingDirectoryTeam {
  team: PublicTeamSummary
  events: PublicEventSummary[]
}

export interface PublicBookingDirectorySection {
  eventType: { id: string; key: string; name: string; description: string | null }
  teams: PublicBookingDirectoryTeam[]
}

export interface PublicBookingDirectoryData {
  id: string
  slug: string
  name: string
  description: string | null
  sections: PublicBookingDirectorySection[]
}

// ─── Communication ────────────────────────────────────────────────────────────

export interface StudentCommunicationLog {
  id: string
  studentId: string
  subject: string
  body: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  errorMessage: string | null
  sentById: string
  sentAt: string
  createdAt: string
  sentBy: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}
