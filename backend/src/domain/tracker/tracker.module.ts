import { createTrackerRepo } from "./tracker.repository";
import { createTrackerService } from "./tracker.service";
import { createTrackerController } from "./tracker.controller";

const trackerRepo = createTrackerRepo();
const trackerService = createTrackerService(trackerRepo);
const trackerController = createTrackerController(trackerService);

export default trackerController;
export { trackerService, trackerRepo };
