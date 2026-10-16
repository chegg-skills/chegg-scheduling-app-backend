import { Prisma, UserRole } from "@prisma/client";
import { createEventGroupService } from "../../src/domain/eventGroups/eventGroup.service";
import type { EventGroupRepository } from "../../src/domain/eventGroups/eventGroup.repository";
import type { TxRunner } from "../../src/shared/db/transaction";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";
import { getManagedTeam } from "../../src/shared/utils/teamAccess";

jest.mock("../../src/shared/utils/teamAccess", () => ({ getManagedTeam: jest.fn() }));

const caller = { id: "u-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const group = (events: number) =>
  ({ id: "g-1", teamId: "t-1", name: "G", _count: { events } }) as never;

const makeRepo = (overrides: Partial<EventGroupRepository> = {}): EventGroupRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findManyByTeam: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(group(0)),
  update: jest.fn().mockResolvedValue(group(0)),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Runs the callback with a sentinel tx so tests can prove it is threaded through.
const fakeTx = { __fake: true } as never;
const makeTxRunner = (): TxRunner => ({ run: jest.fn((fn) => fn(fakeTx)) });

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

describe("createEventGroupService (fake repository + fake tx runner)", () => {
  beforeEach(() => {
    (getManagedTeam as jest.Mock).mockResolvedValue({ id: "t-1" });
  });

  it("maps a duplicate name (P2002) to 409 on create", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    const repo = makeRepo({ create: jest.fn().mockRejectedValue(error) });
    const service = createEventGroupService(repo, makeTxRunner());
    expect(await statusOf(service.createEventGroup("t-1", { name: "G" }, caller))).toBe(409);
  });

  it("404s when reading or updating an unknown group", async () => {
    const service = createEventGroupService(makeRepo(), makeTxRunner());
    expect(await statusOf(service.readEventGroup("x", caller))).toBe(404);
    expect(await statusOf(service.updateEventGroup("x", { name: "n" }, caller))).toBe(404);
  });

  describe("deleteEventGroup", () => {
    it("runs the lookup and delete inside the transaction, threading tx through", async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(group(0)) });
      const txRunner = makeTxRunner();
      await createEventGroupService(repo, txRunner).deleteEventGroup("g-1", caller);

      expect(txRunner.run).toHaveBeenCalledTimes(1);
      expect(repo.findById).toHaveBeenCalledWith("g-1", fakeTx);
      expect(repo.delete).toHaveBeenCalledWith("g-1", fakeTx);
    });

    it("404s for an unknown group and never deletes", async () => {
      const repo = makeRepo();
      const service = createEventGroupService(repo, makeTxRunner());
      expect(await statusOf(service.deleteEventGroup("x", caller))).toBe(404);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("409s when the group still has events", async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(group(3)) });
      const service = createEventGroupService(repo, makeTxRunner());
      expect(await statusOf(service.deleteEventGroup("g-1", caller))).toBe(409);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("checks team access before deleting", async () => {
      (getManagedTeam as jest.Mock).mockRejectedValue(new ErrorHandler(403, "nope"));
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(group(0)) });
      const service = createEventGroupService(repo, makeTxRunner());
      expect(await statusOf(service.deleteEventGroup("g-1", caller))).toBe(403);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
