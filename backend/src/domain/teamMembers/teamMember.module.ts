import { createTeamMemberRepo } from "./teamMember.repository";
import { createTeamMemberService } from "./teamMember.service";
import { createTeamMemberController } from "./teamMember.controller";

const teamMemberRepo = createTeamMemberRepo();
const teamMemberService = createTeamMemberService(teamMemberRepo);
const teamMemberController = createTeamMemberController(teamMemberService);

export default teamMemberController;
export { teamMemberService, teamMemberRepo };
