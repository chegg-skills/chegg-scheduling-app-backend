import { createStatsRepo } from "./stats.repository";
import { createStatsService } from "./stats.service";
import { createStatsController } from "./stats.controller";

const statsRepo = createStatsRepo();
const statsService = createStatsService(statsRepo);
const statsController = createStatsController(statsService);

export default statsController;
export { statsService, statsRepo };
