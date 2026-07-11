/**
 * buildStudentJoinUrl is the single place a Booking.meetingJoinUrl value is ever
 * constructed (booking.service.ts's two creation call sites both delegate to it).
 * This test pins its exact output format so a future change to that format is a
 * deliberate, visible decision, not an accidental drift between the two call sites.
 */
import { buildStudentJoinUrl } from "../../src/domain/bookings/booking.shared";

describe("buildStudentJoinUrl", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = originalApiBaseUrl;
    }
  });

  it("builds the masked redirect URL in the exact expected format", () => {
    process.env.API_BASE_URL = "https://api.example.com";

    const url = buildStudentJoinUrl("booking-123", "token-abc");

    expect(url).toBe("https://api.example.com/api/public/bookings/booking-123/join?t=token-abc");
  });

  it("strips a trailing slash from the configured API base URL", () => {
    process.env.API_BASE_URL = "https://api.example.com/";

    const url = buildStudentJoinUrl("booking-123", "token-abc");

    expect(url).toBe("https://api.example.com/api/public/bookings/booking-123/join?t=token-abc");
  });

  it("never returns a raw/unmasked destination — always the /join redirect path", () => {
    process.env.API_BASE_URL = "https://api.example.com";

    const url = buildStudentJoinUrl("booking-123", "token-abc");

    expect(url).toContain("/api/public/bookings/booking-123/join");
    expect(url).not.toContain("zoom.us");
    expect(url).not.toContain("skills.chegg.com");
  });
});
