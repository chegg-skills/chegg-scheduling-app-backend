import { createInviteRepo } from "./invite.repository";
import { createInviteService } from "./invite.service";
import { createInviteController } from "./invite.controller";

const inviteRepo = createInviteRepo();
const inviteService = createInviteService(inviteRepo);
const inviteController = createInviteController(inviteService);

export default inviteController;
export { inviteService, inviteRepo };
