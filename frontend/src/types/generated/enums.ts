/**
 * AUTO-GENERATED — DO NOT EDIT BY HAND.
 *
 * Source: backend/prisma/schema.prisma
 * Regenerate: from /backend run `npm run sync:enums`
 */

export type UserRole = 'SUPER_ADMIN' | 'TEAM_ADMIN' | 'COACH'
export const UserRoleValues = [
  'SUPER_ADMIN',
  'TEAM_ADMIN',
  'COACH',
] as const

export type AssignmentStrategy = 'DIRECT' | 'ROUND_ROBIN'
export const AssignmentStrategyValues = [
  'DIRECT',
  'ROUND_ROBIN',
] as const

export type EventLocationType = 'VIRTUAL' | 'IN_PERSON' | 'CUSTOM'
export const EventLocationTypeValues = [
  'VIRTUAL',
  'IN_PERSON',
  'CUSTOM',
] as const

export type EventBookingMode = 'COACH_AVAILABILITY' | 'FIXED_SLOTS'
export const EventBookingModeValues = [
  'COACH_AVAILABILITY',
  'FIXED_SLOTS',
] as const

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export const BookingStatusValues = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const

export type SessionLeadershipStrategy = 'SINGLE_COACH' | 'FIXED_LEAD' | 'ROTATING_LEAD'
export const SessionLeadershipStrategyValues = [
  'SINGLE_COACH',
  'FIXED_LEAD',
  'ROTATING_LEAD',
] as const

export type InteractionType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'
export const InteractionTypeValues = [
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
] as const

export type MeetingLinkSource = 'COACH_ISV' | 'EVENT_LOCATION' | 'SESSION_LANDING_PAGE'
export const MeetingLinkSourceValues = [
  'COACH_ISV',
  'EVENT_LOCATION',
  'SESSION_LANDING_PAGE',
] as const
