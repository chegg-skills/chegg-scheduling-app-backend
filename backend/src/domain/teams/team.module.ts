import { createTxRunner } from "../../shared/db/transaction";
import { createTeamRepo } from "./team.repository";
import { createTeamService } from "./team.service";
import { createTeamController } from "./team.controller";
import { createTeamNotificationConfigRepo } from "./team.notificationConfig.repository";
import { createTeamNotificationConfigService } from "./team.notificationConfig.service";
import { createTeamNotificationConfigController } from "./team.notificationConfig.controller";

const teamRepo = createTeamRepo();
const teamService = createTeamService(teamRepo, createTxRunner());
const teamController = createTeamController(teamService);

const teamNotifConfigRepo = createTeamNotificationConfigRepo();
const teamNotifConfigService = createTeamNotificationConfigService(teamNotifConfigRepo);
const teamNotifConfigController = createTeamNotificationConfigController(teamNotifConfigService);

export default teamController;
export {
  teamService,
  teamRepo,
  teamNotifConfigController,
  teamNotifConfigService,
  teamNotifConfigRepo,
};
