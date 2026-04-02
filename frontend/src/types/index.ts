// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'TEAM_ADMIN' | 'COACH'
export type AssignmentStrategy = 'DIRECT' | 'ROUND_ROBIN'
export type EventLocationType = 'VIRTUAL' | 'IN_PERSON' | 'CUSTOM'
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface SafeUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  country: string | null
  preferredLanguage: string | null
  avatarUrl: string | null
  role: UserRole
  timezone: string
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
  hostedEvents: Array<{
    id: string
    event: Event & {
      offering: EventOffering
      interactionType: EventInteractionType
    }
  }>
  weeklyAvailability: UserWeeklyAvailability[]
  availabilityExceptions: UserAvailabilityException[]
}

export interface Team {
  id: string
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

export interface EventInteractionType {
  id: string
  key: string
  name: string
  description: string | null
  supportsRoundRobin: boolean
  supportsMultipleHosts: boolean
  minHosts: number
  maxHosts: number | null
  minParticipants: number
  maxParticipants: number | null
  isActive: boolean
  sortOrder: number
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
}

export interface EventHost {
  id: string
  eventId: string
  hostUserId: string
  hostOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  hostUser: SafeUser
}

export interface Event {
  id: string
  name: string
  description: string | null
  isActive: boolean
  offeringId: string
  interactionTypeId: string
  assignmentStrategy: AssignmentStrategy
  durationSeconds: number
  locationType: EventLocationType
  locationValue: string
  teamId: string
  createdById: string
  updatedById: string
  createdAt: string
  updatedAt: string
  offering: EventOffering
  interactionType: EventInteractionType
  hosts: EventHost[]
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

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phoneNumber?: string
  country?: string
  preferredLanguage?: string
  avatarUrl?: string
  role?: UserRole
  timezone?: string
  isActive?: boolean
}

export interface CreateTeamDto {
  name: string;
  teamLeadId: string;
  description?: string;
  isActive?: boolean;
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
  interactionTypeId: string
  locationType: EventLocationType
  locationValue: string
  durationSeconds: number
  assignmentStrategy?: AssignmentStrategy
  description?: string
  isActive?: boolean
}

export interface UpdateEventDto extends Partial<CreateEventDto> { }

export interface SetEventHostsDto {
  hosts: Array<{ userId: string; hostOrder?: number }>
}

export interface CreateEventOfferingDto {
  key: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateEventOfferingDto extends Partial<CreateEventOfferingDto> { }

export interface CreateInteractionTypeDto {
  key: string
  name: string
  description?: string
  supportsRoundRobin?: boolean
  supportsMultipleHosts?: boolean
  minHosts?: number
  maxHosts?: number | null
  minParticipants?: number
  maxParticipants?: number | null
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateInteractionTypeDto extends Partial<CreateInteractionTypeDto> { }

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
  hostUserId: string
  createdAt: string
  updatedAt: string
  team?: Team
  event?: Event
  host?: SafeUser
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
  preferredHostId?: string
}

export interface ListBookingsFilters {
  teamId?: string
  eventId?: string
  hostUserId?: string
  status?: BookingStatus
  search?: string
}

export interface UpdateBookingStatusDto {
  status: BookingStatus
}
