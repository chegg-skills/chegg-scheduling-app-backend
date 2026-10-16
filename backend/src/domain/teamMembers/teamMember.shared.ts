import { Prisma } from "@prisma/client";
import { safeUserSelect } from "../../shared/utils/userUtils";

export const teamMemberInclude = Prisma.validator<Prisma.TeamMemberInclude>()({
  user: { select: safeUserSelect },
});

export type SafeTeamMember = Prisma.TeamMemberGetPayload<{
  include: typeof teamMemberInclude;
}>;
