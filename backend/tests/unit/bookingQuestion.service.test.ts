import { createBookingQuestionService } from "../../src/domain/systemSettings/bookingQuestion.service";
import type { BookingQuestionRepository } from "../../src/domain/systemSettings/bookingQuestion.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const makeRepo = (
  overrides: Partial<BookingQuestionRepository> = {},
): BookingQuestionRepository => ({
  list: jest.fn().mockResolvedValue([]),
  listTexts: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  maxOrder: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(async (data) => ({ id: "q-new", ...data })),
  update: jest.fn().mockImplementation(async (id, data) => ({ id, text: "t", order: 0, ...data })),
  deleteAndCompactOrder: jest.fn().mockResolvedValue(undefined),
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

describe("createBookingQuestionService (fake repository)", () => {
  it("rejects a sixth default question with 422", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(5) });
    expect(await statusOf(createBookingQuestionService(repo).createDefaultQuestion("Hi"))).toBe(
      422,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects text that is empty after HTML stripping with 400", async () => {
    const repo = makeRepo();
    expect(
      await statusOf(createBookingQuestionService(repo).createDefaultQuestion("<b></b>  ")),
    ).toBe(400);
  });

  it("places a new question after the current max order", async () => {
    const repo = makeRepo({ maxOrder: jest.fn().mockResolvedValue(2) });
    await createBookingQuestionService(repo).createDefaultQuestion("  Why are you here?  ");
    expect(repo.create).toHaveBeenCalledWith({ text: "Why are you here?", order: 3 });
  });

  it("starts ordering at 0 when there are no questions", async () => {
    const repo = makeRepo();
    await createBookingQuestionService(repo).createDefaultQuestion("First");
    expect(repo.create).toHaveBeenCalledWith({ text: "First", order: 0 });
  });

  it("404s when updating or deleting an unknown question", async () => {
    const service = createBookingQuestionService(makeRepo());
    expect(await statusOf(service.updateDefaultQuestion("x", { order: 1 }))).toBe(404);
    expect(await statusOf(service.deleteDefaultQuestion("x"))).toBe(404);
  });

  it("only sends supplied fields on update", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ id: "q-1" }) });
    await createBookingQuestionService(repo).updateDefaultQuestion("q-1", { order: 4 });
    expect(repo.update).toHaveBeenCalledWith("q-1", { order: 4 });
  });

  it("delegates delete + renumbering to the repository", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ id: "q-1" }) });
    await createBookingQuestionService(repo).deleteDefaultQuestion("q-1");
    expect(repo.deleteAndCompactOrder).toHaveBeenCalledWith("q-1");
  });

  it("returns default question texts in repository order", async () => {
    const repo = makeRepo({
      listTexts: jest.fn().mockResolvedValue([{ text: "A" }, { text: "B" }]),
    });
    expect(await createBookingQuestionService(repo).getDefaultQuestionTexts()).toEqual(["A", "B"]);
  });
});
