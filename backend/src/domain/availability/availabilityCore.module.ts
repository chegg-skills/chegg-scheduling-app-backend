import {
  queueAvailabilityExceptionNotification,
  queueAvailabilityExceptionRemovedNotification,
} from "./availability.notification";
import { createAvailabilityConflictRepo } from "./availabilityConflict.repository";
import { createAvailabilityConflictService } from "./availabilityConflict.service";
import { createAvailabilityCalendarRepo } from "./availabilityCalendar.repository";
import { createAvailabilityCalendarService } from "./availabilityCalendar.service";
import { createCoachAvailabilityRepo } from "./coachAvailability.repository";
import { createCoachAvailabilityService } from "./coachAvailability.service";

/**
 * Composition root for the availability building blocks: conflict detection, the raw
 * calendar (weekly hours + exceptions) and the coach-availability evaluation.
 *
 * Deliberately separate from the slot-listing service (availability.service). `events`
 * depends on these building blocks, and the slot-listing service depends on `events`;
 * keeping the building blocks in their own module is what keeps that chain one-way.
 * This module must never import availability.service, events/* or bookings/*
 * (enforced by tests/unit/domainDependencies.architecture.test.ts).
 */

const availabilityConflictRepo = createAvailabilityConflictRepo();
const availabilityConflictService = createAvailabilityConflictService(availabilityConflictRepo);

const availabilityCalendarRepo = createAvailabilityCalendarRepo();
const availabilityCalendarService = createAvailabilityCalendarService(availabilityCalendarRepo, {
  queueAvailabilityExceptionNotification,
  queueAvailabilityExceptionRemovedNotification,
});

const coachAvailabilityRepo = createCoachAvailabilityRepo();
const coachAvailabilityService = createCoachAvailabilityService(coachAvailabilityRepo, {
  getCoachConflicts: availabilityConflictService.getCoachConflicts,
  getEventCoachWeeklyAvailability: availabilityCalendarService.getEventCoachWeeklyAvailability,
});

export {
  availabilityConflictRepo,
  availabilityConflictService,
  availabilityCalendarRepo,
  availabilityCalendarService,
  coachAvailabilityRepo,
  coachAvailabilityService,
};

/**
 * Transitional named exports for callers in domains that have not been converted yet
 * (events, and availability.service until it is converted). They are the service
 * methods themselves — plain closures, no `this` — so call sites keep their existing
 * `fn(...)` shape and only their import path changes. Once a caller's domain is
 * converted it should receive the service by injection instead of using these.
 */
export const { getCoachConflicts, isConflictBlocking } = availabilityConflictService;
export const {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEventCoachWeeklyAvailability,
  setEventCoachWeeklyAvailability,
  getEffectiveAvailabilityData,
} = availabilityCalendarService;
export const { evaluateCoachAvailability, isCoachAvailable } = coachAvailabilityService;
