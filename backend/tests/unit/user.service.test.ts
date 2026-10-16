import { UserRole, type User } from "@prisma/client";
import { createUserService } from "../../src/domain/users/user.service";
import type { UserRepository } from "../../src/domain/users/user.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

jest.mock("../../src/domain/users/user.notification", () => ({
  queueZoomIsvLinkExpiryReminder: jest.fn(),
}));

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "u-1",
    email: "u1@example.com",
    password: "hash",
    firstName: "Ada",
    lastName: "Lovelace",
    role: UserRole.COACH,
    isActive: true,
    publicBookingSlug: "ada-lovelace",
    ...overrides,
  }) as User;

// Every method defaults to "nothing found"; tests override only what they exercise.
const makeRepo = (overrides: Partial<UserRepository> = {}): UserRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findByIdWithDetails: jest.fn().mockResolvedValue(null),
  findRoleById: jest.fn().mockResolvedValue(null),
  findRoleAndStatusById: jest.fn().mockResolvedValue(null),
  findSlugSourceById: jest.fn().mockResolvedValue(null),
  countOtherActiveSuperAdmins: jest.fn().mockResolvedValue(0),
  findManyWithCount: jest.fn().mockResolvedValue([[], 0]),
  update: jest.fn().mockImplementation(async (id, data) => makeUser({ id, ...(data as object) })),
  ...overrides,
});

const caller = (role: UserRole): CallerContext => ({ id: "caller-1", role }) as CallerContext;

const expectError = async (promise: Promise<unknown>, statusCode: number, message?: string) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  expect((error as ErrorHandler).statusCode).toBe(statusCode);
  if (message) expect((error as ErrorHandler).message).toBe(message);
};

describe("createUserService (fake repository)", () => {
  describe("readUser", () => {
    it("404s when the repository finds nothing", async () => {
      const service = createUserService(makeRepo());
      await expectError(service.readUser("missing"), 404, "User not found.");
    });

    it("strips secrets from the returned user", async () => {
      const repo = makeRepo({
        findByIdWithDetails: jest.fn().mockResolvedValue(makeUser({ ssoSub: "sub" } as never)),
      });
      const result = await createUserService(repo).readUser("u-1");
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("ssoSub");
    });
  });

  describe("updateUser", () => {
    it("forbids TEAM_ADMIN from changing roles before touching the database", async () => {
      const repo = makeRepo();
      const service = createUserService(repo);
      await expectError(
        service.updateUser("u-1", { role: UserRole.COACH }, caller(UserRole.TEAM_ADMIN)),
        403,
        "You do not have permission to change user roles.",
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("forbids TEAM_ADMIN from modifying a SUPER_ADMIN", async () => {
      const repo = makeRepo({
        findRoleById: jest.fn().mockResolvedValue({ role: UserRole.SUPER_ADMIN }),
      });
      await expectError(
        createUserService(repo).updateUser("u-1", { firstName: "X" }, caller(UserRole.TEAM_ADMIN)),
        403,
        "You do not have permission to modify a SUPER_ADMIN account.",
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("refuses to demote the last active SUPER_ADMIN", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.SUPER_ADMIN, isActive: true }),
        countOtherActiveSuperAdmins: jest.fn().mockResolvedValue(0),
      });
      await expectError(
        createUserService(repo).updateUser(
          "u-1",
          { role: UserRole.COACH },
          caller(UserRole.SUPER_ADMIN),
        ),
        403,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("allows demotion when another active SUPER_ADMIN exists", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.SUPER_ADMIN, isActive: true }),
        countOtherActiveSuperAdmins: jest.fn().mockResolvedValue(1),
      });
      await createUserService(repo).updateUser(
        "u-1",
        { role: UserRole.COACH },
        caller(UserRole.SUPER_ADMIN),
      );
      expect(repo.update).toHaveBeenCalledWith("u-1", { role: UserRole.COACH });
    });

    it("400s when no updatable field is supplied", async () => {
      await expectError(
        createUserService(makeRepo()).updateUser("u-1", {}, caller(UserRole.SUPER_ADMIN)),
        400,
      );
    });

    it("assigns a public booking slug to a coach that lacks one", async () => {
      const repo = makeRepo({
        findSlugSourceById: jest.fn().mockResolvedValue({
          role: UserRole.COACH,
          publicBookingSlug: null,
          firstName: "Ada",
          lastName: "Lovelace",
        }),
      });
      await createUserService(repo).updateUser(
        "u-1",
        { phoneNumber: "123" },
        caller(UserRole.SUPER_ADMIN),
      );
      const data = (repo.update as jest.Mock).mock.calls[0][1];
      expect(data.publicBookingSlug).toEqual(expect.stringContaining("ada"));
    });
  });

  describe("deleteUser", () => {
    it("404s for an unknown user", async () => {
      await expectError(
        createUserService(makeRepo()).deleteUser("missing", caller(UserRole.SUPER_ADMIN)),
        404,
      );
    });

    it("forbids TEAM_ADMIN from deactivating a non-coach", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.TEAM_ADMIN, isActive: true }),
      });
      await expectError(
        createUserService(repo).deleteUser("u-1", caller(UserRole.TEAM_ADMIN)),
        403,
      );
    });

    it("409s when the account is already inactive", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.COACH, isActive: false }),
      });
      await expectError(
        createUserService(repo).deleteUser("u-1", caller(UserRole.SUPER_ADMIN)),
        409,
        "User account is already inactive.",
      );
    });

    it("refuses to deactivate the last active SUPER_ADMIN", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.SUPER_ADMIN, isActive: true }),
        countOtherActiveSuperAdmins: jest.fn().mockResolvedValue(0),
      });
      await expectError(
        createUserService(repo).deleteUser("u-1", caller(UserRole.SUPER_ADMIN)),
        403,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("deactivates an active coach", async () => {
      const repo = makeRepo({
        findRoleAndStatusById: jest
          .fn()
          .mockResolvedValue({ role: UserRole.COACH, isActive: true }),
      });
      await createUserService(repo).deleteUser("u-1", caller(UserRole.TEAM_ADMIN));
      expect(repo.update).toHaveBeenCalledWith("u-1", { isActive: false });
    });
  });

  describe("listUsers", () => {
    it("computes pagination from the repository's [rows, total] result", async () => {
      const repo = makeRepo({
        findManyWithCount: jest.fn().mockResolvedValue([[makeUser(), makeUser({ id: "u-2" })], 25]),
      });
      const result = await createUserService(repo).listUsers({ page: 1, pageSize: 10 });
      expect(result.users).toHaveLength(2);
      expect(result.pagination).toEqual({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    });
  });
});
