import { createTxRunner } from "../../shared/db/transaction";
import { createEventGroupRepo } from "./eventGroup.repository";
import { createEventGroupService } from "./eventGroup.service";
import { createEventGroupController } from "./eventGroup.controller";

const eventGroupRepo = createEventGroupRepo();
const eventGroupService = createEventGroupService(eventGroupRepo, createTxRunner());
const eventGroupController = createEventGroupController(eventGroupService);

export default eventGroupController;
export { eventGroupService, eventGroupRepo };
  