import { replenishContinuousSlots } from "../events/eventScheduling.service";
import { availabilityCalendarService, isCoachAvailable } from "./availabilityCore.module";
import { createAvailabilitySlotsRepo } from "./availabilitySlots.repository";
import { createAvailabilityService } from "./availability.service";
import { createAvailabilityController } from "./availability.controller";

/**
 * Composition root for the availability HTTP API and slot listing. The building blocks
 * (conflicts, calendar, coach availability) are wired in availabilityCore.module, which is
 * what `events` imports; this module sits above `events` (it hands slot listing the
 * events-owned `replenishContinuousSlots`), so nothing in `events` may import it.
 */

const availabilitySlotsRepo = createAvailabilitySlotsRepo();
const availabilityService = createAvailabilityService(availabilitySlotsRepo, {
  replenishContinuousSlots,
  isCoachAvailable,
});
const availabilityController = createAvailabilityController(availabilityCalendarService);

export default availabilityController;
export { availabilityService, availabilitySlotsRepo };
