// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'TEAM_ADMIN' | 'COACH'
export type AssignmentStrategy = 'DIRECT' | 'ROUND_ROBIN'
export type EventLocationType = 'VIRTUAL' | 'IN_PERSON' | 'CUSTOM'
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type SessionLeadershipStrategy = 'SINGLE_COACH' | 'FIXED_LEAD' | 'ROTATING_LEAD'
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
  isActive: boolean
  failedLoginAttempts: number
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserWithDetails extends SafeUser {
  teamMemberships: Array<{
    id: string
    team: Team
  }>
  coachedEvents: Array<{
    id: string
    event: Event & {
      offering: EventOffering
      interactionType: InteractionType
    }
  }>
  weeklyAvailability: UserWeeklyAvailability[]
  availabilityExceptions: UserAvailabilityException[]
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

export interface EventOffering {
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

export type InteractionType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'

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

export type EventBookingMode = 'COACH_AVAILABILITY' | 'FIXED_SLOTS'

export interface EventScheduleSlot {
  id: string
  eventId: string
  startTime: string
  endTime: string
  capacity: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  assignedCoachId: string | null
  assignedCoach?: SafeUser | null
  _count?: {
    bookings: number
  }
}

export interface Event {
  id: string
  publicBookingSlug: string | null
  name: string
  description: string | null
  isActive: boolean
  offeringId: string
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
  teamId: string
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  offering: EventOffering
  coaches: EventCoach[]
  scheduleSlots?: EventScheduleSlot[]
}

export interface PublicTeamSummary extends Pick<
  Team,
  'id' | 'name' | 'description' | 'publicBookingSlug'
> { }

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
  | 'bookingMode'
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
  offeringId: string
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
}

export interface UpdateEventDto extends Partial<CreateEventDto> { }

export interface SetEventCoachesDto {
  coaches: Array<{ userId: string; coachOrder?: number }>
}

export interface CreateEventOfferingDto {
  key: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateEventOfferingDto extends Partial<CreateEventOfferingDto> { }

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
  createdAt: string
  updatedAt: string
  team?: Team
  event?: Event
  coach?: SafeUser
  scheduleSlot?: EventScheduleSlot
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
