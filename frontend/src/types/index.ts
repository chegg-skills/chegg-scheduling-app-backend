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
} from './generated/enums'

export type {
  UserRole,
  AssignmentStrategy,
  EventLocationType,
  EventBookingMode,
  BookingStatus,
  SessionLeadershipStrategy,
  InteractionType,
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

export interface TeamNotificationConfig {
  teamId: string
  reminderOffsets: number[]
  adminNotifyOnBooking: boolean
  adminNotifyOnCancellation: boolean
  adminNotifyOnNoShow: boolean
  coachNotifyOnBooking: boolean
  coachNotifyOnCancellation: boolean
  coachNotifyOnNoShow: boolean
  notifyLeadOnAvailability: boolean
  createdAt?: string
  updatedAt?: string
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

export interface EventCoach {
  id: string
  eventId: string
  coachUserId: string
  coachOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  coachUser: SafeUser
}

export interface CoachAvailabilityEntry {
  coachUserId: string
  coachUser: SafeUser
  isAvailable: boolean
}

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
}

export interface EventWeeklyAvailability {
  id: string
  eventId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

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
  allowedWeekdays: number[]
  minimumNoticeMinutes: number
  sessionLeadershipStrategy: SessionLeadershipStrategy
  fixedLeadCoachId: string | null
  minCoachCount: number
  maxCoachCount: number | null
  targetCoHostCount: number | null
  minParticipantCount: number | null
  maxParticipantCount: number | null
  bufferAfterMinutes: number
  showDescription: boolean
  deferCoachReveal: boolean
  allowStudentCoachChoice: boolean
  maxBookingWindowDays: number | null
  teamId: string
  sessionTypeId: string | null
  groupId: string | null
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  eventType: EventType
  sessionType?: { id: string; slug: string; name: string } | null
  coaches: EventCoach[]
  weeklyAvailability: EventWeeklyAvailability[]
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
> {}

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
  allowedWeekdays?: number[]
  minimumNoticeMinutes?: number
  minCoachCount?: number
  maxCoachCount?: number | null
  targetCoHostCount?: number | null
  minParticipantCount?: number | null
  maxParticipantCount?: number | null
  bufferAfterMinutes?: number
  description?: string
  isActive?: boolean
  sessionTypeId?: string | null
  groupId?: string | null
  weeklyAvailability?: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

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

export interface UpdateEventTypeDto extends Partial<CreateEventTypeDto> {}

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
  coachUserId: string
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

// Booking shape returned by public-facing endpoints (cancel / reschedule pages).
// event and coach carry only the public-safe subset of fields.
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

// ─── Session Type Models ──────────────────────────────────────────────────────

export interface SessionType {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
}

export interface CreateSessionTypeDto {
  slug: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateSessionTypeDto extends Partial<CreateSessionTypeDto> {}

// ─── Booking Page Models ──────────────────────────────────────────────────────

export interface BookingPageTeamEntry {
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

export interface BookingPageSection {
  id: string
  bookingPageId: string
  sessionTypeId: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  sessionType: SessionType
  teams: BookingPageTeamEntry[]
}

export interface BookingPage {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  sections: BookingPageSection[]
}

export interface CreateBookingPageDto {
  slug: string
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateBookingPageDto extends Partial<CreateBookingPageDto> {}

export interface AddBookingPageSectionDto {
  sessionTypeId: string
  sortOrder?: number
}

export interface AddBookingPageTeamDto {
  teamId: string
  sortOrder?: number
}

// ─── Public Booking Page Types ────────────────────────────────────────────────

export interface PublicSessionType {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
}

export interface PublicBookingPageTeam {
  team: PublicTeamSummary
  events: PublicEventSummary[]
}

export interface PublicBookingPageSection {
  sessionType: PublicSessionType
  teams: PublicBookingPageTeam[]
}

export interface PublicBookingPageData {
  id: string
  slug: string
  name: string
  description: string | null
  sections: PublicBookingPageSection[]
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
