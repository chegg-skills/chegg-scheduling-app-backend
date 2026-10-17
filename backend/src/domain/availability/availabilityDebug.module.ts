import { replenishContinuousSlots } from "../events/eventScheduling.service";
import { evaluateCoachAvailability } from "./availabilityCore.module";
import { createAvailabilityDebugRepo } from "./availabilityDebug.repository";
import { createAvailabilityDebugService } from "./availabilityDebug.service";

/**
 * Composition root for the admin slot-debug report. Separate from availability.module on
 * purpose: its only consumer is the events controller, and availability.module sits above
 * events (so events must not import it). This module imports events' scheduling function but
 * nothing in events imports it back except that controller, which is not part of any import
 * chain this module depends on (enforced by tests/unit/domainDependencies.architecture.test.ts).
 */

const availabilityDebugRepo = createAvailabilityDebugRepo();
const availabilityDebugService = createAvailabilityDebugService(availabilityDebugRepo, {
  replenishContinuousSlots,
  evaluateCoachAvailability,
});

export { availabilityDebugService, availabilityDebugRepo };
