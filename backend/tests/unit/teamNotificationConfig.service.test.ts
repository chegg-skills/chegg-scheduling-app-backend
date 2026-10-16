import { UserRole } from "@prisma/client";
import { createTeamNotificationConfigService } from "../../src/domain/teams/team.notificationConfig.service";
import type { TeamNotificationConfigRepository } from "../../src/domain/teams/team.notificationConfig.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";
import { DEFAULT_NOTIFICATION_CONFIG } from "../../src/shared/notifications/notificationConfig";

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;

const makeRepo = (
  overrides: Partial<TeamNotificationConfigRepository> = {},
): TeamNotificationConfigRepository => ({
  findMembership: jest.fn().mockResolvedValue(null),
  findConfig: jest.fn().mockResolvedValue(null),
  upsertConfig: jest.fn().mockImplementation(async (teamId, data) => ({ teamId, ...data })),
  ...overrides,
});

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

const configData = {
  reminderOffsets: [60],
  adminNotifyOnBooking: true,
  adminNotifyOnCancellation: true,
  adminNotifyOnNoShow: false,
  coachNotifyOnBooking: true,
  coachNotifyOnCancellation: true,
  coachNotifyOnNoShow: false,
  notifyLeadOnAvailability: false,
  sendFeedbackLink: false,
};

describe("createTeamNotificationConfigService (fake repository)", () => {
  it("lets a SUPER_ADMIN through without a membership lookup", async () => {
    const repo = makeRepo();
    await createTeamNotificationConfigService(repo).getNotificationConfig("t-1", superAdmin);
    expect(repo.findMembership).not.toHaveBeenCalled();
  });

  it("403s a TEAM_ADMIN who is not a member, or whose membership is inactive", async () => {
    for (const membership of [null, { isActive: false }]) {
      const repo = makeRepo({ findMembership: jest.fn().mockResolvedValue(membership) });
      const service = createTeamNotificationConfigService(repo);
      expect(await statusOf(service.getNotificationConfig("t-1", teamAdmin))).toBe(403);
      expect(await statusOf(service.upsertNotificationConfig("t-1", configData, teamAdmin))).toBe(
        403,
      );
      expect(repo.upsertConfig).not.toHaveBeenCalled();
    }
  });

  it("lets an active member read and write", async () => {
    const repo = makeRepo({
      findMembership: jest.fn().mockResolvedValue({ isActive: true }),
      findConfig: jest.fn().mockResolvedValue({ teamId: "t-1", reminderOffsets: [15] }),
    });
    const service = createTeamNotificationConfigService(repo);
    expect(await service.getNotificationConfig("t-1", teamAdmin)).toMatchObject({
      reminderOffsets: [15],
    });
    await service.upsertNotificationConfig("t-1", configData, teamAdmin);
    expect(repo.upsertConfig).toHaveBeenCalledWith("t-1", configData);
  });

  it("falls back to the defaults, tagged with the team, when none is stored", async () => {
    const result = await createTeamNotificationConfigService(makeRepo()).getNotificationConfig(
      "t-9",
      superAdmin,
    );
    expect(result).toEqual({ ...DEFAULT_NOTIFICATION_CONFIG, teamId: "t-9" });
  });
});
