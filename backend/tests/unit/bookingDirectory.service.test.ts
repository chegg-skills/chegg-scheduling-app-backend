import { Prisma, UserRole } from "@prisma/client";
import { createBookingDirectoryService } from "../../src/domain/bookingDirectories/bookingDirectory.service";
import type { BookingDirectoryRepository } from "../../src/domain/bookingDirectories/bookingDirectory.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

const superAdmin = { id: "admin-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;

const directory = { id: "d-1", slug: "s", name: "Dir", sections: [] } as never;

const makeRepo = (
  overrides: Partial<BookingDirectoryRepository> = {},
): BookingDirectoryRepository => ({
  findByIdWithSections: jest.fn().mockResolvedValue(directory),
  findAllWithSections: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(directory),
  update: jest.fn().mockResolvedValue(directory),
  delete: jest.fn().mockResolvedValue(undefined),
  findEventTypeById: jest.fn().mockResolvedValue(null),
  findActiveTeamById: jest.fn().mockResolvedValue(null),
  findSectionById: jest.fn().mockResolvedValue(null),
  createSection: jest.fn().mockResolvedValue(undefined),
  deleteSection: jest.fn().mockResolvedValue(undefined),
  findSectionTeam: jest.fn().mockResolvedValue(null),
  createSectionTeam: jest.fn().mockResolvedValue(undefined),
  deleteSectionTeam: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

describe("createBookingDirectoryService (fake repository)", () => {
  it("forbids every operation for non-super-admins before touching the repository", async () => {
    const repo = makeRepo();
    const service = createBookingDirectoryService(repo);

    expect(await statusOf(service.listBookingDirectories(teamAdmin))).toBe(403);
    expect(await statusOf(service.getBookingDirectory("d-1", teamAdmin))).toBe(403);
    expect(await statusOf(service.deleteBookingDirectory("d-1", teamAdmin))).toBe(403);
    expect(repo.findAllWithSections).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("404s when the directory does not exist", async () => {
    const repo = makeRepo({ findByIdWithSections: jest.fn().mockResolvedValue(null) });
    expect(
      await statusOf(createBookingDirectoryService(repo).getBookingDirectory("x", superAdmin)),
    ).toBe(404);
  });

  it("maps a duplicate slug (P2002) to 409 on create", async () => {
    const repo = makeRepo({ create: jest.fn().mockRejectedValue(prismaError("P2002")) });
    const service = createBookingDirectoryService(repo);
    expect(
      await statusOf(service.createBookingDirectory({ slug: "s", name: "n" }, superAdmin)),
    ).toBe(409);
  });

  it("defaults description to null and isActive to true on create", async () => {
    const repo = makeRepo();
    await createBookingDirectoryService(repo).createBookingDirectory(
      { slug: "s", name: "n" },
      superAdmin,
    );
    expect(repo.create).toHaveBeenCalledWith({
      slug: "s",
      name: "n",
      description: null,
      isActive: true,
      createdById: "admin-1",
      updatedById: "admin-1",
    });
  });

  it("maps a missing directory (P2025) to 404 on update and delete", async () => {
    const repo = makeRepo({
      update: jest.fn().mockRejectedValue(prismaError("P2025")),
      delete: jest.fn().mockRejectedValue(prismaError("P2025")),
    });
    const service = createBookingDirectoryService(repo);
    expect(await statusOf(service.updateBookingDirectory("x", { name: "n" }, superAdmin))).toBe(
      404,
    );
    expect(await statusOf(service.deleteBookingDirectory("x", superAdmin))).toBe(404);
  });

  describe("addSection", () => {
    it("404s for an unknown event type and 400s for an inactive one", async () => {
      const unknown = createBookingDirectoryService(makeRepo());
      expect(await statusOf(unknown.addSection("d-1", { eventTypeId: "e" }, superAdmin))).toBe(404);

      const inactive = createBookingDirectoryService(
        makeRepo({ findEventTypeById: jest.fn().mockResolvedValue({ id: "e", isActive: false }) }),
      );
      expect(await statusOf(inactive.addSection("d-1", { eventTypeId: "e" }, superAdmin))).toBe(
        400,
      );
    });

    it("maps a duplicate event type (P2002) to 409", async () => {
      const repo = makeRepo({
        findEventTypeById: jest.fn().mockResolvedValue({ id: "e", isActive: true }),
        createSection: jest.fn().mockRejectedValue(prismaError("P2002")),
      });
      expect(
        await statusOf(
          createBookingDirectoryService(repo).addSection("d-1", { eventTypeId: "e" }, superAdmin),
        ),
      ).toBe(409);
    });
  });

  describe("sections and teams", () => {
    it("404s when the section belongs to a different directory", async () => {
      const repo = makeRepo({
        findSectionById: jest.fn().mockResolvedValue({ id: "s-1", bookingDirectoryId: "other" }),
      });
      const service = createBookingDirectoryService(repo);
      expect(await statusOf(service.removeSection("d-1", "s-1", superAdmin))).toBe(404);
      expect(repo.deleteSection).not.toHaveBeenCalled();
    });

    it("404s when adding a team that is missing or soft-deleted", async () => {
      const repo = makeRepo({
        findSectionById: jest.fn().mockResolvedValue({ id: "s-1", bookingDirectoryId: "d-1" }),
      });
      expect(
        await statusOf(
          createBookingDirectoryService(repo).addTeamToSection(
            "d-1",
            "s-1",
            { teamId: "t-1" },
            superAdmin,
          ),
        ),
      ).toBe(404);
    });

    it("404s when removing a team that is not in the section", async () => {
      const repo = makeRepo({
        findSectionById: jest.fn().mockResolvedValue({ id: "s-1", bookingDirectoryId: "d-1" }),
      });
      expect(
        await statusOf(
          createBookingDirectoryService(repo).removeTeamFromSection(
            "d-1",
            "s-1",
            "t-1",
            superAdmin,
          ),
        ),
      ).toBe(404);
      expect(repo.deleteSectionTeam).not.toHaveBeenCalled();
    });
  });
});
